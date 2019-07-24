function init(wsServer, path) {
    const
        fs = require('fs'),
        express = require('express'),
        app = wsServer.app,
        registry = wsServer.users,
        EventEmitter = require("events"),
        randomColor = require('randomcolor'),
        channel = "decrypto",
        testMode = process.argv[2] === "debug";

    let defaultCodeWords, engCodeWords;
    fs.readFile(`${__dirname}/words.json`, "utf8", function (err, words) {
        defaultCodeWords = JSON.parse(words)[0];
        fs.readFile(`${registry.config.appDir || __dirname}/moderated-words.json`, "utf8", function (err, words) {
            if (words) {
                defaultCodeWords = JSON.parse(words)[1];
            }
        });
    });
    fs.readFile(__dirname + "/words-en.json", "utf8", function (err, words) {
        engCodeWords = JSON.parse(words)[0];
    });

    app.get(path, function (req, res) {
        res.sendFile(`${__dirname}/public/app.html`);
    });
    app.use("/decrypto", express.static(`${__dirname}/public`));

    class GameState extends EventEmitter {
        constructor(hostId, hostData, userRegistry) {
            super();
            let timerInterval;
            const
                room = {
                    inited: true,
                    hostId: hostId,
                    spectators: new JSONSet(),
                    playerColors: {},
                    playerNames: {},
                    onlinePlayers: new JSONSet(),
                    black: new JSONSet(),
                    white: new JSONSet(),
                    blackWords: [],
                    whiteWords: [],
                    blackCodeWords: [],
                    whiteCodeWords: [],
                    blackWordGuesses: [],
                    whiteWordGuesses: [],
                    blackMaster: null,
                    whiteMaster: null,
                    blackFailCount: 0,
                    whiteFailCount: 0,
                    blackHackCount: 0,
                    whiteHackCount: 0,
                    teamsLocked: false,
                    teamWin: null,
                    timed: true,
                    masterTime: testMode ? 5 : 60,
                    teamTime: testMode ? 5 : 60,
                    time: null,
                    paused: true,
                    readyPlayers: new JSONSet(),
                    blackSlotPlayers: new JSONSet(),
                    whiteSpectators: new JSONSet(),
                    blackSpectators: new JSONSet(),
                    rounds: [
                        //{ white: {codeWords: [], try: [], hackTry [] } }
                    ],
                    phase: 0,
                    testMode
                };
            if (testMode)
                [1, 2, 3, 4, 5, 6].forEach((ind) => {
                    room.playerNames[`kek${ind}`] = `kek${ind}`;
                });
            room.black = new JSONSet(["kek1", "kek2", "kek3"]);
            room.white = new JSONSet(["kek4", "kek5", "kek6"]);
            this.room = room;
            this.lastInteraction = new Date();
            const state = {black: {}, white: {}};
            //    white: {
            //        words: [],
            //        code: [],
            //        codeWords: [],
            //        guesses: [{
            //            player: "a",
            //            votes: ["a", "b"],
            //            code: [1, 2, 3]
            //        }],
            //        hackGuesses: [],
            //        wordGuesses: []
            //    }
            this.state = state;
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                sendState = (user) => {
                    if (room.blackMaster === user) {
                        send(user, "player-state", Object.assign({}, state.black, {
                            guesses: []
                        }));
                    } else if (room.whiteMaster === user) {
                        send(user, "player-state", Object.assign({}, state.white, {
                            guesses: []
                        }));
                    } else if (room.black.has(user)) {
                        send(user, "player-state", Object.assign({}, state.black, {
                            code: [],
                            codeWords: []
                        }));
                    } else if (room.white.has(user)) {
                        send(user, "player-state", Object.assign({}, state.white, {
                            code: [],
                            codeWords: []
                        }));
                    } else if (room.whiteSpectators.has(user)) {
                        send(user, "player-state", state.white);
                    } else if (room.blackSpectators.has(user)) {
                        send(user, "player-state", state.black);
                    } else {
                        send(user, "player-state", {});
                    }
                },
                updateState = () => [...room.onlinePlayers].forEach(sendState),
                startGame = () => {
                    if (room.black.size > 1 && room.white.size > 1) {
                        room.whiteFailCount = 0;
                        room.whiteHackCount = 0;
                        room.blackFailCount = 0;
                        room.blackHackCount = 0;
                        room.teamWin = null;
                        room.teamsLocked = true;
                        room.rounds = [];
                        if (room.timed)
                            room.paused = false;
                        shuffleArray(defaultCodeWords);
                        state.black.words = defaultCodeWords.slice(0, 4);
                        state.white.words = defaultCodeWords.slice(4, 8);
                        state.black.wordGuesses = [];
                        state.white.wordGuesses = [];
                        startRound();
                    }
                },
                startRound = () => {
                    room.phase = 1;
                    room.blackMaster = [...room.black][[...room.black].indexOf(room.blackMaster) + 1];
                    if (!room.blackMaster)
                        room.blackMaster = [...room.black][0];
                    room.whiteMaster = [...room.white][[...room.white].indexOf(room.whiteMaster) + 1];
                    if (!room.whiteMaster)
                        room.whiteMaster = [...room.white][0];
                    room.readyPlayers.clear();
                    state.black.code = shuffleArray([1, 2, 3, 4]).slice(0, 3);
                    state.white.code = shuffleArray([1, 2, 3, 4]).slice(0, 3);
                    state.black.codeWords = [];
                    state.white.codeWords = [];
                    room.blackCodeWords = [];
                    room.whiteCodeWords = [];
                    startTimer();
                    update();
                    updateState();
                },
                startTeamPhase = () => {
                    room.phase = 2;
                    room.readyPlayers.clear();
                    room.blackCodeWords = state.black.codeWords;
                    room.whiteCodeWords = state.white.codeWords;
                    state.black.guesses = [];
                    state.white.guesses = [];
                    state.black.hackGuesses = [];
                    state.white.hackGuesses = [];
                    startTimer();
                    update();
                    updateState();
                },
                calcTry = (team, isHack) => {
                    const guesses = state[team][!isHack ? "guesses" : "hackGuesses"];
                    if (guesses.length === 0)
                        return [];
                    const mostVoted = guesses.sort((a, b) => b.votes.length - a.votes.length)[0];
                    if (mostVoted.votes.length >= Math.ceil(room[team].size / 2))
                        return mostVoted.code;
                    else
                        return [];
                },
                isEqualCodes = (codeA, codeB) => codeA.every((word, index) => word === codeB[index]),
                endRound = () => {
                    const round = {
                        black: {
                            codeWords: room.blackCodeWords,
                            try: calcTry("black"),
                            hackTry: calcTry("black", true),
                            code: state.black.code
                        },
                        white: {
                            codeWords: room.whiteCodeWords,
                            try: calcTry("white"),
                            hackTry: calcTry("white", true),
                            code: state.white.code
                        },
                    };
                    room.rounds.push(round);
                    if (!isEqualCodes(round.black.try, round.black.code))
                        room.blackFailCount++;
                    if (!isEqualCodes(round.white.try, round.white.code))
                        room.whiteFailCount++;
                    if (isEqualCodes(round.black.hackTry, round.white.code))
                        room.blackHackCount++;
                    if (isEqualCodes(round.white.hackTry, round.black.code))
                        room.whiteHackCount++;
                    if (room.rounds.length === 8
                        || room.blackHackCount > 1
                        || room.whiteHackCount > 1
                        || room.blackFailCount > 1
                        || room.whiteFailCount > 1)
                        endGame();
                    else
                        startRound();
                },
                endGame = () => {
                    room.paused = true;
                    room.phase = 0;
                    room.teamsLocekd = false;
                    clearInterval(timerInterval);
                    room.teamWin = "tie";
                    if (room.blackFailCount === 2 && room.whiteHackCount < 2 && room.whiteFailCount < 2)
                        room.teamWin = "white";
                    else if (room.whiteFailCount === 2 && room.blackHackCount < 2 && room.blackFailCount < 2)
                        room.teamWin = "black";
                    else if (room.blackHackCount === 2 && room.whiteHackCount < 2 && room.whiteFailCount < 2)
                        room.teamWin = "black";
                    else if (room.whiteHackCount === 2 && room.blackHackCount < 2 && room.blackFailCount < 2)
                        room.teamWin = "white";
                    else if (room.rounds.length === 8) {
                        let
                            blackPoints = room.blackHackCount - room.blackFailCount,
                            whitePoints = room.whiteHackCount - room.whiteFailCount;
                        if (whitePoints !== blackPoints)
                            room.teamWin = blackPoints > whitePoints ? "black" : "white";
                        else {
                            state.black.words.forEach((word, index) => {
                                if (word.toLowerCase() === state.white.wordGuesses[index].toLowerCase())
                                    whitePoints++;
                            });
                            state.white.words.forEach((word, index) => {
                                if (word.toLowerCase() === state.black.wordGuesses[index].toLowerCase())
                                    blackPoints++;
                            });
                            if (whitePoints !== blackPoints)
                                room.teamWin = blackPoints > whitePoints ? "black" : "white";
                        }
                    }
                    room.blackWords = state.black.words;
                    room.whiteWords = state.white.words;
                    room.blackWordGuesses = state.black.wordGuesses;
                    room.whiteWordGuesses = state.white.wordGuesses;
                    update();
                    updateState();
                },
                startTimer = () => {
                    if (room.timed) {
                        if (room.phase === 1)
                            room.time = room.masterTime * 1000;
                        else
                            room.time = room.teamTime * 1000;
                        let time = new Date();
                        clearInterval(timerInterval);
                        timerInterval = setInterval(() => {
                            if (!room.paused) {
                                room.time -= new Date() - time;
                                time = new Date();
                                if (room.time <= 0) {
                                    clearInterval(timerInterval);
                                    if (room.phase === 1)
                                        startTeamPhase();
                                    else
                                        endRound();
                                }
                            } else time = new Date();
                        }, 100);
                    }
                },
                leaveTeams = (user, keepSpectator) => {
                    room.black.delete(user);
                    room.white.delete(user);
                    if (!keepSpectator)
                        room.spectators.delete(user);
                    if (room.blackMaster === user)
                        room.blackMaster = null;
                    else if (room.whiteMaster === user)
                        room.whiteMaster = null;
                    sendState(user);
                },
                removePlayer = (playerId) => {
                    leaveTeams(playerId, true);
                    if (room.spectators.has(playerId) || !room.onlinePlayers.has(playerId)) {
                        room.spectators.delete(playerId);
                        delete room.playerNames[playerId];
                        registry.disconnect(playerId, "You was removed");
                    } else
                        room.spectators.add(playerId);
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    room.playerColors[user] = data.userColor || room.playerColors[user] || randomColor();
                    update();
                    sendState(user);
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    if (room.onlinePlayers.size === 0 && !testMode) {
                        clearInterval(timerInterval);
                        room.paused = true;
                    }
                    update();
                },
                userEvent = (user, event, data) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.eventHandlers[event])
                            this.eventHandlers[event](user, data[0], data[1], data[2]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {
                "highlight": (user, data) => {
                    if (room.black.has(user) || room.white.has(user)) {
                        const color = room.black.has(user) ? "black" : "white";
                        send([...room[color]], "highlight", data);
                    }
                },
                "set-code-word": (user, index, word) => {
                    if (room.phase === 1 && ~[0, 1, 2].indexOf(index) && word
                        && !room.readyPlayers.has(user)
                        && (room.blackMaster === user || room.whiteMaster === user)) {
                        const color = room.blackMaster === user ? "black" : "white";
                        state[color].codeWords[index] = word;
                        updateState();
                    }
                },
                "add-guess": (user, code, isHack) => {
                    if (room.phase === 2 && (room.black.has(user) || room.white.has(user))
                        && code && code.every && code.every((number) => ~[1, 2, 3, 4].indexOf(number))
                        && (new Set(code)).size === code.length) {
                        const
                            color = room.black.has(user) ? "black" : "white",
                            guessList = state[color][!isHack ? "guesses" : "hackGuesses"];
                        if (guessList.every((item) => item.code.join() !== code.join())) {
                            guessList.push({
                                code,
                                player: user,
                                votes: []
                            });
                            updateState();
                        }
                    }
                },
                "remove-guess": (user, index, isHack) => {
                    if (room.phase === 2 && (room.black.has(user) || room.white.has(user))) {
                        const
                            color = room.black.has(user) ? "black" : "white",
                            guesses = state[color][!isHack ? "guesses" : "hackGuesses"];
                        if (guesses[index].player === user)
                            guesses.splice(index, 1);
                        updateState();
                    }
                },
                "vote-guess": (user, index, isHack) => {
                    if (room.phase === 2 && (room.black.has(user) || room.white.has(user))) {
                        const
                            color = room.black.has(user) ? "black" : "white",
                            guesses = state[color][!isHack ? "guesses" : "hackGuesses"];
                        if (guesses[index])
                            if (~guesses[index].votes.indexOf(user))
                                guesses[index].votes.splice(guesses[index].votes.indexOf(user), 1);
                            else {
                                guesses.forEach((guess) => {
                                    if (~guess.votes.indexOf(user))
                                        guess.votes.splice(guess.votes.indexOf(user), 1);
                                });
                                guesses[index].votes.push(user);
                            }
                        update();
                        updateState();
                    }
                },
                "set-word-guess": (user, index, guess) => {
                    if (~[1,2].indexOf(room.phase) && (room.black.has(user) || room.white.has(user))) {
                        const color = room.black.has(user) ? "black" : "white";
                        state[color].wordGuesses[index] = guess;
                        updateState();
                    }
                },
                "toggle-ready": (user) => {
                    if (room.phase === 1 && !room.readyPlayers.has(user) && (room.blackMaster === user || room.whiteMaster === user)) {
                        room.readyPlayers.add(user);
                        if (room.readyPlayers.size === 1)
                            if (room.timed && room.time > (30 * 1000))
                                room.time = 30 * 1000;
                            else
                                startTeamPhase();
                        update();
                    } else if (room.phase === 2 && (room.black.has(user) || room.white.has(user))) {
                        if (room.readyPlayers.has(user))
                            room.readyPlayers.delete(user);
                        else
                            room.readyPlayers.add(user);
                        if (room.readyPlayers.size === (room.black.size + room.white.size))
                            endRound();
                        else
                            update();
                    }
                },
                "start-game": (user) => {
                    if (user === room.hostId)
                        startGame();
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "toggle-paused": (user) => {
                    if (user === room.hostId)
                        room.paused = !room.paused;
                    update();
                },
                "toggle-timed": (user) => {
                    if (user === room.hostId) {
                        room.timed = !room.timed;
                        if (!room.timed) {
                            room.paused = true;
                            clearInterval(timerInterval);
                        } else {
                            if (room.phase !== 0) {
                                room.paused = false;
                                startTimer();
                            } else room.paused = true;
                        }
                    }
                    update();
                },
                "set-time": (user, type, value) => {
                    if (user === room.hostId && ~["master", "team"].indexOf(type) && !isNaN(value) && value >= 1)
                        room[`${type}Time`] = value;
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                },
                "change-color": (user) => {
                    room.playerColors[user] = randomColor();
                    update();
                },
                "remove-player": (user, playerId) => {
                    if (playerId && user === room.hostId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (playerId && user === room.hostId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "toggle-black-slot": (user, playerId) => {
                    if (user === room.hostId && room.spectators.has(playerId)) {
                        if (!room.blackSlotPlayers.has(playerId)) {
                            room.blackSlotPlayers.add(playerId);
                            room.blackSpectators.add(playerId);
                        } else {
                            room.blackSlotPlayers.delete(playerId);
                            room.blackSpectators.delete(playerId);
                            room.whiteSpectators.delete(playerId);
                        }
                    }
                    update();
                    sendState(playerId);
                },
                "players-join": (user, color) => {
                    if (!room.teamsLocked && ~["white", "black"].indexOf(color) && !room[color].has(user)) {
                        leaveTeams(user);
                        room[color].add(user);
                        update();
                        sendState(user);
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked) {
                        leaveTeams(user);
                        room.spectators.add(user);
                        update();
                        sendState(user);
                    }
                }
            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.paused = true;
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.readyPlayers = new JSONSet(this.room.readyPlayers);
            this.room.black = new JSONSet(this.room.black);
            this.room.white = new JSONSet(this.room.white);
            this.room.blackSlotPlayers = new JSONSet(this.room.blackSlotPlayers);
            this.room.blackSpectators = new JSONSet(this.room.blackSpectators);
            this.room.whiteSpectators = new JSONSet(this.room.whiteSpectators);
            this.room.onlinePlayers.clear();
        }
    }

    function shuffleArray(array) {
        let currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;

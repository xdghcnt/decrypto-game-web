function init(wsServer, path) {
    const
        fs = require('fs'),
        express = require('express'),
        app = wsServer.app,
        registry = wsServer.users,
        EventEmitter = require("events"),
        randomColor = require('randomcolor'),
        channel = "decrypto";

    let defaultCodeWords, engCodeWords;
    fs.readFile(__dirname + "/words.json", "utf8", function (err, words) {
        defaultCodeWords = JSON.parse(words);
    });
    fs.readFile(`${__dirname}/words.json`, "utf8", function (err, words) {
        defaultCodeWords = JSON.parse(words);
        fs.readFile(`${registry.config.appDir || __dirname}/moderated-words.json`, "utf8", function (err, words) {
            if (words) {
                let moderatedWords = JSON.parse(words);
                moderatedWords[0] = defaultCodeWords[0];
                defaultCodeWords = moderatedWords;
            }
        });
    });
    fs.readFile(__dirname + "/words-en.json", "utf8", function (err, words) {
        engCodeWords = JSON.parse(words);
    });

    app.get(path, function (req, res) {
        res.sendFile(`${__dirname}/public/app.html`);
    });
    app.use("/decrypto", express.static(`${__dirname}/public`));

    class GameState extends EventEmitter {
        constructor(hostId, hostData, userRegistry) {
            super();
            const
                room = {},
                intervals = {};
            this.room = room;
            this.lastInteraction = new Date();
            const state = {};
            this.state = state;
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                userJoin = (data) => {
                },
                userLeft = (user) => {
                },
                userEvent = (user, event, data) => {
                };
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {};
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
                state: {}
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
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

//import React from "react";
//import ReactDOM from "react-dom"
//import io from "socket.io"
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Player extends React.Component {
    render() {
        const
            data = this.props.data,
            id = this.props.id,
            game = this.props.game,
            blackSlotButton = <i
                className={cs("material-icons", "host-button", {"black-slot-mark": data.hostId !== data.userId})}
                title={data.hostId === data.userId ? (!~data.blackSlotPlayers.indexOf(id)
                    ? "Give black slot" : "Remove black slot") : "Black slot"}
                onClick={(evt) => game.handleGiveBlackSlot(id, evt)}>
                {!~data.blackSlotPlayers.indexOf(id) ? "visibility_off" : "visibility"}
            </i>;
        return (
            <div className={cs("player", {
                offline: !~data.onlinePlayers.indexOf(id),
                self: id === data.userId
            })}
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                <div className="player-color"
                     style={{
                         background: data.playerColors[id],
                         "box-shadow": (data.phase === 2 && ~data.readyPlayers.indexOf(id))
                             ? `0 0 0 3px ${data.playerColors[id]}85`
                             : "none"
                     }}
                     onClick={(evt) => !evt.stopPropagation() && (id === data.userId) && game.handleChangeColor()}/>
                <span className="player-name">{data.playerNames[id]}&nbsp;</span>
                {(data.whiteMaster === id || data.blackMaster === id)
                    ? <span
                        className={cs("material-icons", "master-icon", {ready: data.phase === 1 && !!~data.readyPlayers.indexOf(id)})}
                        title="Encoder">save</span>
                    : ""}
                {(~data.blackSlotPlayers.indexOf(id)) ? (
                    <span className="black-slot-button">{blackSlotButton}</span>
                ) : ""}
                <div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Give host"
                           onClick={(evt) => game.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
                    ) : ""}
                    {(this.props.isSpectator && data.hostId === data.userId && !~data.blackSlotPlayers.indexOf(id)) ? (
                        blackSlotButton
                    ) : ""}
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Remove"
                           onClick={(evt) => game.handleRemovePlayer(id, evt)}>
                            delete_forever
                        </i>
                    ) : ""}
                    {(data.hostId === id) ? (
                        <i className="material-icons host-button inactive"
                           title="Game host">
                            stars
                        </i>
                    ) : ""}
                </div>
            </div>
        );
    }
}

class Team extends React.Component {
    render() {
        const
            data = this.props.data,
            color = this.props.color,
            playerTeam = this.props.playerTeam,
            game = this.props.game,
            showCode = data.teamWin !== null
                || (playerTeam && ((data.userId === data.blackMaster || data.userId === data.whiteMaster)
                    || ~data.blackSlotPlayers.indexOf(data.userId)));
        return (
            <div className={cs("team", color)}>
                <div className={cs("code", {
                    "active": showCode
                })}>
                    {showCode
                        ? (data.teamWin == null
                            ? data.player.code && data.player.code.join(".")
                            : (data.teamWin === color
                                ? "WIN"
                                : "LOSE"))
                        : ""}
                </div>
                <div className="players">
                    {data[color].map((id) => <Player id={id} data={data} game={game}/>)}
                    {!data.teamsLocked
                        ? <div onClick={() => game.handleJoinTeam(color)} className="join-team-button">
                            <span className="material-icons">arrow_upward</span>
                            Join
                            <span className="material-icons">arrow_upward</span>
                        </div>
                        : ""}
                </div>
                {new Array(data[`${color}FailCount`]).fill().map((it, index) => <div
                    onClick={() => game.handleClickToken(index, color, "fail")}
                    style={{
                        top: game.getTokenParams("fail", "top", index, color),
                        left: game.getTokenParams("fail", "left", index, color),
                        transform: game.getTokenParams("fail", "transform", index, color)
                    }}
                    className={cs("token", "fail-token", `fail-token-${index}`)}/>)}
                {new Array(data[`${color}HackCount`]).fill().map((it, index) => <div
                    onClick={() => game.handleClickToken(index, color, "hack")}
                    style={{
                        top: game.getTokenParams("hack", "top", index, color),
                        left: game.getTokenParams("hack", "left", index, color),
                        transform: game.getTokenParams("hack", "transform", index, color)
                    }}
                    className={cs("token", "hack-token", `hack-token-${index}`)}/>)}
            </div>
        );
    }
}

class RoundTable extends React.Component {
    render() {
        const
            data = this.props.data,
            game = this.props.game,
            color = this.props.color,
            round = this.props.round,
            roundNum = this.props.roundNum,
            isEnemy = this.props.isEnemy,
            isRoundAnim = this.props.isRoundAnim,
            emptyHolder = <span className="empty-holder">&lt;Empty&gt;</span>,
            isEqualCodes = (codeA, codeB) =>
                codeA.length && codeB.length && codeA.every((word, index) => word === codeB[index]),
            enemyTryFailed = isEnemy && !isEqualCodes(round.try, round.code);
        return (
            <div className={cs("round-table", color)}>
                <div className="round-number">{`0${roundNum + 1}`}</div>
                {[0, 1, 2].map((index) => {
                        let
                            codeTry = (data.teamWin || !isEnemy || !enemyTryFailed) ? (round.try[index] || "-") : "?",
                            codeTryHack = (data.rounds[roundNum][color === "white" ? "black" : "white"].hackTry[index] || "-"),
                            code = round.code[index],
                            showTryColor = !isRoundAnim
                                ? true
                                : (data.roundAnimPhase > index && !(data.roundAnimPhase < 3 && isEnemy)),
                            showHackTryColor = !isRoundAnim ? true : (data.roundAnimPhase > index);
                        if (isRoundAnim) {
                            if (data.roundAnimPhase <= index) {
                                code = "";
                                if (!isEnemy)
                                    codeTryHack = "";
                                else
                                    codeTry = "";
                            }
                            if (data.roundAnimPhase < 3 && isEnemy)
                                codeTry = "?";
                            if (data.roundAnimSound && index === (data.roundAnimPhase - 1)) {
                                if (!isEnemy ? (codeTry === code) : (codeTryHack === code))
                                    game.correctSound.play();
                                else
                                    game.wrongSound.play();
                                data.roundAnimSound = false;
                            }
                        }
                        return <div className="round-table-row">
                            <div className="round-table-code-word">
                                {round.codeWords[index] || emptyHolder}
                            </div>
                            <div className={cs("round-table-code", "try", {
                                correct: showTryColor && (codeTry === code), wrong: showTryColor && (codeTry !== code)
                            })}>
                                {codeTry}
                            </div>
                            <div className="round-table-code">
                                {code}
                            </div>
                            <div className={cs("round-table-code", "hack-try", {
                                correct: showHackTryColor && (codeTryHack === code),
                                wrong: showHackTryColor && (codeTryHack !== code)
                            })}>
                                {codeTryHack}
                            </div>
                        </div>;
                    }
                )}
            </div>
        );
    }
}

class WordsInputPane extends React.Component {
    render() {
        const
            data = this.props.data,
            color = this.props.color,
            hack = this.props.hack,
            game = this.props.game,
            codes = this.props.codes,
            isSpectator = !!~data.spectators.indexOf(data.userId),
            emptyHolder = <span className="empty-holder">&lt;Empty&gt;</span>,
            communicationIcon = <span className="material-icons">headset_mic</span>,
            interceptionIcon = <span className="material-icons">lock</span>;
        return (
            <div className={cs("words-input", color)}>
                <div
                    className="words-input-title">{(!hack && (!isSpectator || ~data.blackSlotPlayers.indexOf(data.userId)))
                    ? <span>{
                        color === "black" ? communicationIcon : ""}
                        Communication
                        {color === "white" ? communicationIcon : ""}
                </span>
                    : <span>
                        {color === "black" ? interceptionIcon : ""}
                        Interception
                        {color === "white" ? interceptionIcon : ""}
                    </span>}
                </div>
                <div className="word-rows">
                    {[0, 1, 2].map((index) => {
                            return <div className="word-row">
                                <div className="word-input">
                                    {(data.phase === 1 && data[`${color}Master`] === data.userId && data.player.words)
                                        ? (!~data.readyPlayers.indexOf(data.userId)
                                            ? (<input placeholder={data.player.words[data.player.code[index] - 1]}
                                                      onChange={(evt) => game.handleChangeCodeWord(index, evt.target.value)}
                                                      defaultValue={(data.player.codeWords && data.player.codeWords[index]) || ""}/>)
                                            : data.player.codeWords[index])
                                        : !(data.teamAnimPhase != null && data.teamAnimPhase < index)
                                            ? <span
                                                className="code-word">{(data[`${color}CodeWords`] && data[`${color}CodeWords`][index]) ||
                                            emptyHolder}
                                                {(data.phase === 2 && data.hostId === data.userId)
                                                    ? <i className="material-icons host-button edit-word-button"
                                                         title="Edit"
                                                         onClick={() => game.handleEditCodeWord(color, index)}>
                                                        &nbsp;edit
                                                    </i>
                                                    : ""}
                                            </span>
                                            : emptyHolder}
                                </div>
                                <div className="code-input">
                                    {codes[index] || "-"}
                                </div>
                            </div>;
                        }
                    )}
                </div>
                {(data.player[!hack ? "guesses" : "hackGuesses"] || []).map((guess, index) =>
                    !guess.stub
                        ? (<div className="guess" style={{
                            "background": `${data.playerColors[guess.player]}40`,
                            "border-color": data.playerColors[guess.player]
                        }}
                                onClick={(evt) => game.toggleVoteGuess(index, hack)}>
                            {guess.code.map((code) => <div className="guess-code">
                                {code}
                            </div>)}
                            <div className="guess-vote-list">
                                {guess.votes.map((vote) =>
                                    <span style={{"background": `${data.playerColors[vote]}a1`}}
                                          className="guess-vote"/>
                                )}

                            </div>
                            {guess.player === data.userId
                                ? <span
                                    onClick={(evt) => game.handleClickRemoveGuess(evt, index, hack)}
                                    style={{"background": `${data.playerColors[guess.player]}a1`}}
                                    className="remove-guess material-icons">close</span>
                                : ""}
                        </div>)
                        : <div className="guess guess-stub">?</div>
                )}
                {!isSpectator && (data.phase === 2 && (data[`${color}Master`] !== data.userId || hack) && (data.rounds.length || !hack))
                    ? <div className={cs("add-guess", {
                        hidden: data.teamAnimPhase != null && data.teamAnimPhase < 3
                    })}>
                        <div className="add-guess-button" onClick={() => game.handleClickAddGuess(hack)}>
                            <span className="material-icons">add_box</span>
                        </div>
                        <div className="add-guess-inputs">
                            {[0, 1, 2].map((index) =>
                                <div
                                    onContextMenu={(evt) => evt.preventDefault()}
                                    onMouseUp={(evt) => game.toggleGuessInput(index, hack, evt)}
                                    className="guess-input">{data.inputs[!hack ? "guess" : "hack"][index]}</div>)}
                        </div>
                    </div>
                    : ""}
            </div>
        );
    }
}

class WordColumn extends React.Component {
    render() {
        const
            data = this.props.data,
            index = this.props.index,
            codeList = this.props.codeList,
            isEnemy = this.props.isEnemy,
            playerTeam = this.props.playerTeam,
            enemyTeam = playerTeam === "black" ? "white" : "black",
            game = this.props.game,
            hasWords = !!data.player.words,
            emptyHolder = <span className="empty-holder">&lt;Empty&gt;</span>,
            unknownHolder = "";
        return (
            <div className={cs("word-column", isEnemy ? enemyTeam : playerTeam)}>
                <div className="word">
                    <div className="word-number">
                        <i className="material-icons">vpn_key</i>
                        {index + 1}
                    </div>
                    {!data.teamWin
                        ? hasWords
                            ? (!isEnemy
                                ? (data.player.words[index])
                                : !~data.blackSlotPlayers.indexOf(data.userId)
                                    ? <input
                                        placeholder="<Unknown>"
                                        onChange={(evt) => game.handleChangeWordGuess(index, evt.target.value)}
                                        value={data.player.wordGuesses[index]}/>
                                    : data.player.wordGuesses[index])
                            : unknownHolder
                        : (!isEnemy
                            ? `${(data[`${enemyTeam}WordGuesses`][index]) || "-"} (${data[`${playerTeam}Words`][index]})`
                            : `${(data[`${playerTeam}WordGuesses`][index] || "-")} (${data[`${enemyTeam}Words`][index]})`)}
                </div>
                <div
                    className="word-codes-list">{codeList[index].length ? codeList[index].map((word) =>
                    <div className="word-code-list-item">{word || emptyHolder}</div>
                ) : <div
                    className="word-code-list-holder material-icons">more_horiz</div>}</div>
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (parseInt(localStorage.darkThemeDecrypto))
            document.body.classList.add("dark-theme");
        if (!localStorage.decryptoUserId || !localStorage.decryptoUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.decryptoUserId = makeId();
            localStorage.decryptoUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        if (localStorage.acceptDelete) {
            initArgs.acceptDelete = localStorage.acceptDelete;
            delete localStorage.acceptDelete;
        }
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.decryptoUserId;
        initArgs.userName = localStorage.userName;
        initArgs.token = localStorage.decryptoUserToken;
        initArgs.userColor = localStorage.decryptoUserColor;
        initArgs.wssToken = window.wssToken;
        this.socket = window.socket.of("decrypto");
        this.socket.on("state", state => {
            const
                init = !this.state.inited,
                updateTokenAnim = this.state.blackFailCount < state.blackFailCount
                    || this.state.whiteFailCount < state.whiteFailCount
                    || this.state.blackHackCount < state.blackHackCount
                    || this.state.whiteHackCount < state.whiteHackCount,
                roundAnimSound = !this.isMuted() && state.roundAnimPhase !== this.state.roundAnimPhase && state.roundAnimPhase > 0,
                roundAnim = state.roundAnimPhase !== this.state.roundAnimPhase;
            if (!this.isMuted() && this.state.inited
                && ((this.state.blackMaster !== this.state.userId && state.blackMaster === this.state.userId)
                    || (this.state.whiteMaster !== this.state.userId && state.whiteMaster === this.state.userId)))
                this.masterNotifySound.play();
            if (this.state.inited
                && (this.state.blackMaster !== this.state.userId
                    && this.state.whiteMaster !== this.state.userId
                    && state.phase === 2 && this.state.phase === 1)) {
                if (!this.isMuted())
                    this.teamNotifySound.play();
                this.startTeamAnim();
            }
            if (!this.isMuted() && this.state.inited
                && state.phase === 1 && this.state.readyPlayers.length === 0 && state.readyPlayers.length === 1)
                this.masterReadySound.play();
            if (!this.isMuted() && this.state.inited && (this.state.teamWin === null && state.teamWin != null)) {
                this.gameEndSignalSound.play();
                this.gameEndSound.play();
            }
            if (!this.isMuted() && this.state.inited && (this.state.phase === 0 && state.phase !== 0))
                this.gameStartSound.play();
            this.setState(Object.assign(this.state, {
                userId: this.userId,
                player: this.state.player || {},
                inputs: this.state.inputs || {guess: [1, 1, 1], hack: [1, 1, 1]},
                roundAnimSound
            }, state), () => {
                if (roundAnim)
                    setTimeout(() => {
                        [...document.getElementsByClassName("round-anim")].forEach((node) =>
                            node.classList.add("after-anim"))
                    }, 0);
                if (init)
                    [...document.getElementsByClassName("token")].forEach((node, index) =>
                        node.classList.add("after-anim"));
                else if (updateTokenAnim)
                    [...document.getElementsByClassName("token")].forEach((node, index) =>
                        setTimeout(() => node.classList.add("after-anim"), 100 * (index + 1)));
            });
            if (this.state.playerColors[this.userId])
                localStorage.decryptoUserColor = this.state.playerColors[this.userId];
        });
        this.socket.on("player-state", (player) => {
            this.setState(Object.assign(this.state, {
                player
            }));
        });
        this.socket.on("highlight", (data) => {
            this.highlight(data);
        });
        this.socket.on("message", text => {
            popup.alert({content: text});
        });
        window.socket.on("disconnect", (event) => {
            this.setState({
                inited: false,
                disconnected: true,
                disconnectReason: event.reason
            });
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        document.title = `Decrypto - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
        this.timerSound = new Audio("/decrypto/media/timer-beep.mp3");
        this.chimeSound = new Audio("/decrypto/media/chime.mp3");
        this.tapSound = new Audio("/decrypto/media/tap.mp3");
        this.correctSound = new Audio("/decrypto/media/correct.mp3");
        this.wrongSound = new Audio("/decrypto/media/wrong.mp3");
        this.masterNotifySound = new Audio("/decrypto/media/master_notify.mp3");
        this.teamNotifySound = new Audio("/decrypto/media/team_notify.mp3");
        this.tumblerSound = new Audio("/decrypto/media/tumbler.mp3");
        this.switchSound = new Audio("/decrypto/media/switch.mp3");
        this.knobSound = new Audio("/decrypto/media/knob.mp3");
        this.stickerSound = new Audio("/decrypto/media/sticker.mp3");
        this.gameStartSound = new Audio("/decrypto/media/game_start.mp3");
        this.gameEndSound = new Audio("/decrypto/media/game_end.mp3");
        this.gameEndSignalSound = new Audio("/decrypto/media/game_end_signal.mp3");
        this.masterReadySound = new Audio("/decrypto/media/master_ready.mp3");
        this.timerSound.volume = 0.5;
        this.chimeSound.volume = 0.25;
        this.correctSound.volume = 0.3;
        this.masterNotifySound.volume = 0.5;
        this.teamNotifySound.volume = 0.2;
        this.wrongSound.volume = 0.07;
        this.tapSound.volume = 0.3;
        this.tumblerSound.volume = 0.5;
        this.switchSound.volume = 0.5;
        this.knobSound.volume = 0.5;
        this.stickerSound.volume = 0.5;
        this.gameStartSound.volume = 0.3;
        this.gameEndSound.volume = 0.25;
        this.gameEndSignalSound.volume = 1.0;
        this.masterReadySound.volume = 0.2;
        window.hyphenate = createHyphenator(hyphenationPatternsRu);
        window.hyphenateEn = createHyphenator(hyphenationPatternsEnUs);
        this.tokenParams = {};
        this.viewParams = {};
        this.generateViewParams();
    }

    startTeamAnim() {
        this.state.teamAnimPhase = 0;
        this.setState(this.state);
        clearInterval(this.teamAnimInterval);
        this.teamAnimInterval = setInterval(() => {
            this.state.teamAnimPhase++;
            if (this.state.teamAnimPhase === 4) {
                clearInterval(this.teamAnimInterval);
                this.state.teamAnimPhase = null;
            }
            this.setState(this.state);
        }, 800);
    }

    generateViewParams() {
        [0, 1].forEach((index) => {
            ["black", "white"].forEach((color) => {
                ["fail", "hack"].forEach((kind) => {
                    this.tokenParams[`${index}${color}${kind}`] = this.getRandomParams();
                });
            });
        });
        ["black", "white"].forEach((color) => {
            Array(12).fill(null).forEach((mda, index) => {
                this.viewParams[`${color}-tumbler-${index}`] = this.getRandomInt(2);
            });
            Array(4).fill(null).forEach((mda, index) => {
                this.viewParams[`${color}-knob-${index}`] = this.getRandomInt(11);
            });
            Array(2).fill(null).forEach((mda, index) => {
                this.viewParams[`${color}-lamp-${index}`] = this.getRandomInt(2);
            });
            this.viewParams[`${color}-switch-`] = this.getRandomInt(2);
            this.viewParams[`${color}-sticker-`] = 0;
        });
    }

    handleClickViewParam(color, kind, index) {
        let state, newState;
        state = newState = this.viewParams[`${color}-${kind}-${index}`] || this.viewParams[`${color}-${kind}-`];
        if (~["tumbler", "switch"].indexOf(kind))
            newState = (state ? 0 : 1);
        else if (kind === "knob")
            newState = this.getRandomInt(11);
        else if (kind === "sticker" && !state && this.getRandomInt(10) === 9)
            newState = 1;
        this.viewParams[`${color}-${kind}-${index}`] = newState;
        if (kind !== "sticker") {
            this.viewParams[`${color}-lamp-0`] = this.getRandomInt(2);
            this.viewParams[`${color}-lamp-1`] = this.getRandomInt(2);
        }
        if (!this.isMuted()) {
            if (kind === "tumbler")
                this.tumblerSound.play();
            else if (kind === "switch")
                this.switchSound.play();
            else if (kind === "knob")
                this.knobSound.play();
            else if (kind === "sticker" && this.viewParams[`${color}-sticker-`])
                this.stickerSound.play();
        }
        this.setState(this.state);
    }

    handleClickToken(index, color, kind) {
        this.tokenParams[`${index}${color}${kind}`] = this.getRandomParams();
        this.setState(this.state);
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    getRandomParams() {
        return {
            left: `${this.getRandomInt(150)}px`,
            top: `${this.getRandomInt(147)}px`,
            transform: `rotate(${this.getRandomInt(360)}deg)`
        };
    }

    toggleGuessInput(index, hack, evt) {
        const inputs = this.state.inputs[!hack ? "guess" : "hack"];
        if (evt.button !== 2) {
            if (inputs[index] === 4)
                inputs[index] = 1;
            else
                inputs[index]++;
        } else {
            if (inputs[index] === 1)
                inputs[index] = 4;
            else
                inputs[index]--;
        }
        this.setState(this.state);
    }

    handleToggleTheme() {
        localStorage.darkThemeDecrypto = !parseInt(localStorage.darkThemeDecrypto) ? 1 : 0;
        document.body.classList.toggle("dark-theme");
        this.setState(Object.assign({}, this.state));
    }

    getTokenParams(kind, param, index, color) {
        return this.tokenParams[`${index}${color}${kind}`][param];
    }

    debouncedEmit(event, data1, data2) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, data1, data2);
        }, 100);
    }

    highlight(data) {

    }

    handleJoinTeam(color) {
        this.socket.emit("players-join", color);
    }

    handleJoinSpectators() {
        this.socket.emit("spectators-join");
    }

    handleJoinBlackSlot(color) {
        this.socket.emit("black-slot-join", color);
    }

    handleGiveHost(user) {
        this.socket.emit("give-host", user);
    }

    handleRemovePlayer(user) {
        this.socket.emit("remove-player", user);
    }

    handleGiveBlackSlot(user, evt) {
        evt.stopPropagation();
        this.socket.emit("toggle-black-slot", user);
    }

    handleChangeColor() {
        this.socket.emit("change-color");
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleClickStart() {
        if (this.state.phase !== 0)
            popup.confirm({content: "Game will be aborted. Are you sure?"}, (evt) => evt.proceed && this.socket.emit("start-game"));
        else
            this.socket.emit("start-game");
    }

    handleClickPause() {
        this.socket.emit("toggle-paused");
    }

    handleToggleTimed() {
        this.socket.emit("toggle-timed");
    }

    handleToggleMuteSounds() {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        this.setState(Object.assign({}, this.state));
    }

    handleClickChangeName() {
        popup.prompt({content: "New name", value: this.state.playerNames[this.state.userId] || ""}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                this.socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    openRules() {
        window.open("/decrypto/media/rules.pdf", "_blank");
    }

    isMuted() {
        return !!parseInt(localStorage.muteSounds);
    }

    handleChangeTime(value, type) {
        this.socket.emit("set-time", type, value || 1);
    }

    handleChangeCodeWord(index, word) {
        this.state.player.codeWords[index] = word;
        this.setState(this.state);
        this.debouncedEmit("set-code-word", index, word);
    }

    handleClickReady() {
        if (this.state.phase === 0)
            this.handleClickStart();
        else
            this.socket.emit("toggle-ready");
    }

    handleClickAddGuess(hack) {
        this.socket.emit("add-guess", this.state.inputs[!hack ? "guess" : "hack"], hack);
    }

    toggleVoteGuess(index, hack) {
        this.socket.emit("vote-guess", index, hack);
    }

    handleClickRemoveGuess(evt, index, hack) {
        evt.stopPropagation();
        this.socket.emit("remove-guess", index, hack);
    }


    handleChangeWordGuess(index, guess) {
        this.state.player.wordGuesses[index] = guess;
        this.setState(this.state);
        this.socket.emit("set-word-guess", index, guess);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    calcTry(team, hack) {
        if (this.state.player.guesses && (this.state[`${team}Master`] !== this.state.userId || hack)) {
            const guesses = this.state.player[!hack ? "guesses" : "hackGuesses"];
            if (!guesses || guesses.length === 0 || guesses[0].stub)
                return [];
            const sorted = (guesses.slice()).sort((a, b) => b.votes.length - a.votes.length);
            if (!sorted[1] || sorted[0].votes.length > sorted[1].votes.length)
                return sorted[0].code;
            else
                return [];
        } else return [];
    }

    toggleRoundsLocked() {
        this.state.roundsLocked = !this.state.roundsLocked;
        this.setState(this.state);
    }

    handleClickShuffle() {
        if (this.state.phase !== 0)
            popup.confirm({content: "Game will be aborted. Are you sure?"}, (evt) => evt.proceed && this.socket.emit("shuffle-players"));
        else
            this.socket.emit("shuffle-players");
    }

    handleEditCodeWord(color, index) {
        const word = this.state[`${color}CodeWords`][index];
        popup.prompt({content: "Edit command", value: word}, (evt) => {
            if (evt.proceed && evt.input_value.trim())
                this.socket.emit("edit-code-word", color, index, evt.input_value);
        });
    }

    render() {
        clearTimeout(this.timerTimeout);
        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            const
                data = this.state,
                game = this,
                user = data.userId,
                isHost = data.hostId === data.userId,
                parentDir = location.pathname.match(/(.+?)\//)[1],
                notEnoughPlayers = data.phase === 0 && (data.black.length < 2 || data.white.length < 2),
                isSpectator = !!~data.spectators.indexOf(user),
                playerTeam = (~data.black.indexOf(user) || ~data.blackSpectators.indexOf(user)) ? "black" : "white",
                enemyTeam = playerTeam === "white" ? "black" : "white",
                isMaster = data[`${playerTeam}Master`] === data.userId,
                teamWordCodesList = [[], [], [], []],
                enemyWordCodesList = [[], [], [], []],
                teamCodes = this.calcTry(playerTeam),
                enemyCodes = this.calcTry(playerTeam, true),
                animTeam = ["black", "white"][(data.rounds.length + 1 + data.roundAnimSection) % 2];
            let readyButtonText = "";
            if (data.teamWin === "tie")
                readyButtonText = "Tie";
            else if (data.teamWin)
                readyButtonText = `${data.teamWin} wins`;
            else if (data.phase === 0 && !notEnoughPlayers && isHost)
                readyButtonText = "Start";
            else if (data.phase === 0 && !notEnoughPlayers)
                readyButtonText = "Host can start";
            else if (data.phase === 0)
                readyButtonText = "Not enough players";
            else if (data.phase === 1 && isMaster && !~data.readyPlayers.indexOf(data.userId))
                readyButtonText = "Ready";
            else if (data.phase === 2 && !isSpectator && (!isMaster || data.rounds.length > 0))
                readyButtonText = "Ready";
            else if (data.phase === 1)
                readyButtonText = "Encoding";
            else if (data.phase === 2)
                readyButtonText = "Decoding";
            data.rounds.forEach((round) => {
                round[playerTeam].code.forEach((codeItem, index) => {
                    teamWordCodesList[codeItem - 1].push(round[playerTeam].codeWords[index]);
                });
                round[enemyTeam].code.forEach((codeItem, index) => {
                    enemyWordCodesList[codeItem - 1].push(round[enemyTeam].codeWords[index]);
                });
            });
            if (!data.paused) {
                let timeStart = new Date();
                this.timerTimeout = setTimeout(() => {
                    if (!this.state.paused && this.state.time > 0) {
                        let prevTime = this.state.time,
                            time = prevTime - (new Date() - timeStart);
                        this.setState(Object.assign({}, this.state, {time: time}));
                        if (this.state.timed && time < 6000
                            && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0)
                            && !parseInt(localStorage.muteSounds)
                            && !data.roundAnim)
                            this.timerSound.play();
                    }
                }, 100);
            }
            return (
                <div className={cs("game",
                    {
                        [`${this.state.teamWin}-win`]: this.state.teamWin
                    })}>
                    <div className="main-row">
                        <Team color="white" data={data} game={game}
                              playerTeam={playerTeam === "white"}/>
                        <div className={cs("stand", playerTeam)}>
                            {(data.player.words ? data.player.words.map((word, index) =>
                                <div
                                    className={cs("stand-code", `stand-code-${index}`)}>
                                    <div className="stand-code-word">{hyphenate(word) || "?"}</div>
                                </div>) : "")}
                            <div className="stand-controls">
                                <div className="stand-tumblers">
                                    {[0, 1, 2, 3].map((groupIndex) =>
                                        <div className="stand-tumblers-group">{[0, 1, 2].map((tumbleIndex) => {
                                            const index = groupIndex * 3 + tumbleIndex;
                                            return <div
                                                className={cs("stand-tumbler",
                                                    playerTeam,
                                                    `stand-tumbler-${game.viewParams[`${playerTeam}-tumbler-${index}`]}`)}
                                                onClick={() => game.handleClickViewParam(playerTeam,
                                                    "tumbler",
                                                    index
                                                )}/>;
                                        })
                                        }</div>)}
                                </div>
                                <div className="stand-knobs">{[0, 1, 2, 3].map((knobIndex) =>
                                    <div
                                        className={cs("stand-knob", playerTeam)}
                                        style={{transform: `rotate(${game.viewParams[`${playerTeam}-knob-${knobIndex}`] * 30 - 155}deg)`}}
                                        onClick={() => game.handleClickViewParam(playerTeam,
                                            "knob",
                                            knobIndex
                                        )}/>)
                                }</div>
                                <div className="stand-lamps">{[0, 1].map((lampIndex) =>
                                    <div
                                        className={cs("stand-lamp",
                                            playerTeam,
                                            `stand-lamp-ind-${lampIndex}`,
                                            `stand-lamp-${game.viewParams[`${playerTeam}-lamp-${lampIndex}`]}`)}/>)
                                }</div>
                                <div
                                    className={cs("stand-switch",
                                        playerTeam,
                                        `stand-switch-${game.viewParams[`${playerTeam}-switch-`]}`)}
                                    onClick={() => game.handleClickViewParam(playerTeam,
                                        "switch",
                                        ""
                                    )}/>
                                <div
                                    className={cs("stand-sticker",
                                        playerTeam,
                                        `stand-sticker-${game.viewParams[`${playerTeam}-sticker-`]}`)}
                                    onClick={() => game.handleClickViewParam(playerTeam,
                                        "sticker",
                                        ""
                                    )}/>
                            </div>
                        </div>
                        <Team color="black" data={data} game={game}
                              playerTeam={playerTeam === "black"}/>
                    </div>
                    <div className="timer">{data.timed ? <span className="timer-time">
                                    {(new Date(!data.teamWin
                                        ? (data.time > 0
                                            ? data.time
                                            : data.masterTime * 1000)
                                        : 0)).toUTCString().match(/(\d\d:\d\d )/)[0].trim()}
                                </span> : ""}</div>
                    <div className="main-pane">
                        <WordsInputPane data={data} game={game} color="white"
                                        codes={playerTeam === "white" ? teamCodes : enemyCodes}
                                        hack={playerTeam === "black"}/>
                        <WordsInputPane data={data} game={game} color="black"
                                        codes={playerTeam === "black" ? teamCodes : enemyCodes}
                                        hack={playerTeam === "white"}/>
                    </div>
                    <div className="ready-button" onClick={() => this.handleClickReady()}>
                        {readyButtonText}
                        <div className="ready-markers">
                            {(!isSpectator && data.phase === 2) ? data.readyPlayers
                                .filter((item) => ~data[playerTeam].indexOf(item)
                                    && (data.rounds.length || (data.blackMaster !== item && data.whiteMaster !== item)))
                                .map((playerId) =>
                                    <div className="player-color"
                                         style={{background: data.playerColors[playerId]}}/>) : ""}
                        </div>
                    </div>
                    <div className="words-section">
                        <div className="words-column-team">
                            <div className="words-column-group">
                                {[0, 1].map((index) => <WordColumn playerTeam={playerTeam}
                                                                   index={index} data={data}
                                                                   game={this} isEnemy={playerTeam === "black"}
                                                                   codeList={playerTeam === "black"
                                                                       ? enemyWordCodesList
                                                                       : teamWordCodesList}/>)}
                            </div>
                            <div className="words-column-group">
                                {[2, 3].map((index) => <WordColumn playerTeam={playerTeam}
                                                                   index={index} data={data}
                                                                   game={this} isEnemy={playerTeam === "black"}
                                                                   codeList={playerTeam === "black"
                                                                       ? enemyWordCodesList
                                                                       : teamWordCodesList}/>)}
                            </div>
                        </div>
                        <div className="words-column-team">
                            <div className="words-column-group">
                                {[0, 1].map((index) => <WordColumn playerTeam={playerTeam}
                                                                   index={index} data={data}
                                                                   game={this} isEnemy={playerTeam === "white"}
                                                                   codeList={playerTeam === "white"
                                                                       ? enemyWordCodesList
                                                                       : teamWordCodesList}/>)}
                            </div>
                            <div className="words-column-group">
                                {[2, 3].map((index) => <WordColumn playerTeam={playerTeam}
                                                                   index={index} data={data}
                                                                   game={this} isEnemy={playerTeam === "white"}
                                                                   codeList={playerTeam === "white"
                                                                       ? enemyWordCodesList
                                                                       : teamWordCodesList}/>)}
                            </div>
                        </div>
                    </div>
                    <div className={cs("rounds-section", {locked: !!data.roundsLocked})}
                         onClick={() => this.toggleRoundsLocked()}>
                        <div className="round-section-button material-icons"/>
                        {data.rounds.map((round, index) =>
                            <div className="round-row">
                                <RoundTable data={data} game={this} round={round[playerTeam]} roundNum={index}
                                            color={playerTeam}/>
                                <RoundTable data={data} game={this} round={round[enemyTeam]} roundNum={index}
                                            color={enemyTeam}
                                            isEnemy={true}/>
                            </div>
                        )}
                    </div>
                    {data.roundAnim
                        ? <div className="round-anim">
                            <div className={cs("round-code", animTeam)}>
                                <div className={cs("code", {
                                    active: data.roundAnimPhase > 0
                                })}>
                                    {data.rounds[data.rounds.length - 1][animTeam].code.slice(0, data.roundAnimPhase).join(".")}
                                </div>
                            </div>
                            <RoundTable data={data} game={this} round={data.rounds[data.rounds.length - 1][animTeam]}
                                        roundNum={data.rounds.length - 1} isEnemy={animTeam !== playerTeam}
                                        color={animTeam} isRoundAnim={true}/>
                        </div>
                        : ""}
                    <div className={
                        cs("spectators-section", {active: data.spectators.length > 0 || !data.teamsLocked})}>
                        <div
                            onClick={() => this.handleJoinSpectators()}
                            className="spectators">
                            Spectators:
                            {
                                data.spectators.length ? data.spectators.map(
                                    (player) => (<Player data={data} id={player} isSpectator={true}
                                                         game={this}/>)
                                ) : " ..."
                            }
                        </div>
                    </div>
                    {~data.blackSlotPlayers.indexOf(data.userId)
                        ? <div
                            className="spectators switch-black-slots">
                            <div className="black-slot-type"
                                 onClick={() => game.handleJoinBlackSlot("white")}>
                                White{~data.whiteSpectators.indexOf(data.userId) ?
                                <i className="material-icons">visibility</i> : ""}
                            </div>
                            <div className="black-slot-type"
                                 onClick={() => game.handleJoinBlackSlot("black")}>
                                Black{~data.blackSpectators.indexOf(data.userId) ?
                                <i className="material-icons">visibility</i> : ""}
                            </div>
                        </div>
                        : ""}
                    <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                        {data.timed ? (<div className="host-controls-menu">
                            <div className="little-controls">
                                <div className="game-settings little-controls">
                                    <div className="set-master-time"><i title="Encode time"
                                                                        className="material-icons">alarm</i>
                                        {(isHost && data.paused) ? (<input id="master-time"
                                                                           type="number"
                                                                           defaultValue={this.state.masterTime}
                                                                           min="0"
                                                                           onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                               && this.handleChangeTime(evt.target.valueAsNumber, "master")}
                                        />) : (<span className="value">{this.state.masterTime}</span>)}
                                    </div>
                                    <div className="set-team-time"><i title="Decode time"
                                                                      className="material-icons">alarm_on</i>
                                        {(isHost && data.paused) ? (<input id="round-time"
                                                                           type="number"
                                                                           defaultValue={this.state.teamTime} min="0"
                                                                           onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                               && this.handleChangeTime(evt.target.valueAsNumber, "team")}
                                        />) : (<span className="value">{this.state.teamTime}</span>)}
                                    </div>
                                    {(isHost && data.paused) ? (
                                        <div className="shuffle-players settings-button"
                                             onClick={() => this.handleClickShuffle()}><i
                                            title="shuffle players"
                                            className="material-icons">casino</i>
                                        </div>) : ""}
                                </div>
                            </div>
                        </div>) : ""}

                        <div className="side-buttons">
                            <i onClick={() => window.location = parentDir}
                               className="material-icons exit settings-button">exit_to_app</i>
                            <i onClick={() => this.openRules()}
                               className="material-icons settings-button">help_outline</i>
                            {isHost ? (!data.timed
                                ? (<i onClick={() => this.handleToggleTimed()}
                                      className="material-icons start-game settings-button">alarm_off</i>)
                                : (<i onClick={() => this.handleToggleTimed()}
                                      className="material-icons start-game settings-button">alarm</i>)) : ""}
                            {isHost ? (data.teamsLocked
                                ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_outline</i>)
                                : (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_open</i>)) : ""}
                            {isHost ? ((data.phase === 0 && data.teamWin == null)
                                ? (<i onClick={() => this.handleClickStart()}
                                      title={notEnoughPlayers ? "Not enough players" : ""}
                                      className={cs("material-icons", "start-game", "settings-button", {inactive: notEnoughPlayers})}>
                                    play_arrow</i>)
                                : (<i onClick={() => this.handleClickStart()}
                                      title={notEnoughPlayers ? "Not enough players" : ""}
                                      className={cs("material-icons", "start-game", "settings-button", {inactive: notEnoughPlayers})}>sync</i>)) : ""}
                            {isHost && data.timed && data.phase !== 0 ? (
                                <i onClick={() => this.handleClickPause()}
                                   className="material-icons start-game settings-button">{data.paused ? "play_arrow" : "pause"}</i>) : ""}
                            <i onClick={() => this.handleClickChangeName()}
                               className="toggle-theme material-icons settings-button">edit</i>
                            {!this.isMuted()
                                ? (<i onClick={() => this.handleToggleMuteSounds()}
                                      className="toggle-theme material-icons settings-button">volume_up</i>)
                                : (<i onClick={() => this.handleToggleMuteSounds()}
                                      className="toggle-theme material-icons settings-button">volume_off</i>)}
                            {!parseInt(localStorage.darkThemeDecrypto)
                                ? (<i onClick={() => this.handleToggleTheme()}
                                      className="toggle-theme material-icons settings-button">brightness_2</i>)
                                : (<i onClick={() => this.handleToggleTheme()}
                                      className="toggle-theme material-icons settings-button">wb_sunny</i>)}
                        </div>
                        <i className="settings-hover-button material-icons">settings</i>
                        <CommonRoom state={this.state}/>
                    </div>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));

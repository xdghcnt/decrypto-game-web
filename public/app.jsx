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
                <div className="player-color" style={{background: data.playerColors[id]}}
                     onClick={(evt) => !evt.stopPropagation() && (id === data.userId) && game.handleChangeColor()}/>
                {data.playerNames[id]}&nbsp;
                {(data.whiteMaster === id || data.blackMaster === id)
                    ? <span className="material-icons master-icon" title="Encoder">save</span>
                    : ""}
                {(~data.blackSlotPlayers.indexOf(id)) ? (
                    <span className="black-slot-button">&nbsp;{blackSlotButton}</span>
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
            showCode = playerTeam && (data.userId === data.blackMaster || data.userId === data.whiteMaster);
        return (
            <div className={cs("team", color)}>
                <div className={cs("code", {
                    "active": showCode
                })}>
                    {showCode ? data.player.code.join(".") : ""}
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
                    style={{
                        top: game.getTokenParams("fail", "top", index, color),
                        left: game.getTokenParams("fail", "left", index, color),
                        transform: game.getTokenParams("fail", "transform", index, color)
                    }}
                    className={cs("token", "fail-token", `fail-token-${index}`)}/>)}
                {new Array(data[`${color}HackCount`]).fill().map((it, index) => <div
                    style={{
                        top: game.getTokenParams("hack", "top", index, color),
                        left: game.getTokenParams("hack", "left", index, color),
                        transform: game.getTokenParams("fail", "transform", index, color)
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
            color = this.props.color,
            isEnemy = this.props.isEnemy,
            round = this.props.round,
            roundNum = this.props.roundNum,
            emptyHolder = <span className="empty-holder">&lt;Empty&gt;</span>;
        return (
            <div className={cs("round-table", color)}>
                <div className="round-number">{`0${roundNum + 1}`}</div>
                {[0, 1, 2].map((index) =>
                    <div className="round-table-row">
                        <div className="round-table-code-word">
                            {round.codeWords[index] || emptyHolder}
                        </div>
                        <div className="round-table-code-try">
                            {(round[!isEnemy ? "try" : "hackTry"][index] || "-")}
                        </div>
                        <div className="round-table-code">
                            {round.code[index] || "-"}
                        </div>
                    </div>
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
            emptyHolder = <span className="empty-holder">&lt;Empty&gt;</span>;
        return (
            <div className={cs("words-input", color)}>
                <div className="word-rows">
                    {[0, 1, 2].map((index) =>
                        <div className="word-row">
                            <div className="word-input">
                                {data.phase === 1 && (data[`${color}Master`] === data.userId)
                                    ? <input placeholder="<Input>"
                                             onChange={(evt) => game.handleChangCodeWord(index, evt.target.value)}
                                             defaultValue={data.player.codeWords && data.player.codeWords[index]}/>
                                    : ((data[`${color}CodeWords`] && data[`${color}CodeWords`][index]) || emptyHolder)}
                            </div>
                            <div className="code-input">
                                {codes[index] || "-"}
                            </div>
                        </div>
                    )}
                </div>
                {(data.player[!hack ? "guesses" : "hackGuesses"] || []).map((guess, index) =>
                    <div className="guess" style={{"background": `${data.playerColors[guess.player]}40`}}
                         onClick={(evt) => game.toggleVoteGuess(index, hack)}>
                        {guess.code.map((code) => <div className="guess-code">
                            {code}
                        </div>)}
                        <div className="guess-vote-list">
                            {guess.votes.map((vote) =>
                                <span onClick={(evt) => game.handleClickRemoveGuess(evt, index, hack)}
                                      style={{"background": `${data.playerColors[vote]}a1`}}
                                      className="guess-vote material-icons">check</span>
                            )}

                        </div>
                        {guess.player === data.userId
                            ? <span onClick={(evt) => game.handleClickRemoveGuess(evt, index, hack)}
                                    style={{"background": `${data.playerColors[guess.player]}a1`}}
                                    className="remove-guess material-icons">close</span>
                            : ""}
                    </div>
                )}
                {(data.phase === 2 && (data[`${color}Master`] !== data.userId || hack))
                    ? <div className="add-guess">
                        <div className="add-guess-button" onClick={() => game.handleClickAddGuess(hack)}>
                            <span className="material-icons">add_box</span>
                        </div>
                        <div className="add-guess-inputs">
                            {[0, 1, 2].map((index) =>
                                <input id={`guess-add-${index}-${hack ? "hack" : ""}`}
                                       className="add-guess-input"
                                       type="number"
                                       defaultValue={1}
                                       min="1"
                                       max="4"
                                       onChange={evt => !isNaN(evt.target.valueAsNumber)}
                                />)}
                        </div>
                    </div>
                    : ""}
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!localStorage.decryptoUserId || !localStorage.decryptoUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.decryptoUserId = makeId();
            localStorage.decryptoUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, "#" + makeId());
        if (localStorage.acceptDelete) {
            initArgs.acceptDelete = localStorage.acceptDelete;
            delete localStorage.acceptDelete;
        }
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.decryptoUserId;
        initArgs.userName = localStorage.userName;
        initArgs.token = localStorage.decryptoUserToken;
        initArgs.userColor = localStorage.decryptoUserColor;
        this.socket = window.socket.of("decrypto");
        this.socket.on("state", state => {
            this.setState(Object.assign(this.state, {
                userId: this.userId,
                player: this.state.player || {}
            }, state));
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
        this.timerSound.volume = 0.5;
        this.chimeSound.volume = 0.25;
        this.tapSound.volume = 0.3;
        window.hyphenate = createHyphenator(hyphenationPatternsRu);
        window.hyphenateEn = createHyphenator(hyphenationPatternsEnUs);
        this.tokenParams = {};
        this.generateTokenParams();
    }

    generateTokenParams() {
        const getRandomInt = (max) => {
            return Math.floor(Math.random() * Math.floor(max));
        };
        [0, 1].forEach((index) => {
            ["black", "white"].forEach((color) => {
                ["fail", "hack"].forEach((kind) => {
                    this.tokenParams[`${index}${color}${kind}`] = {
                        left: `${getRandomInt(150)}px`,
                        top: `${getRandomInt(147)}px`,
                        transform: `rotate(${getRandomInt(360)}deg)`
                    };
                });
            });
        });
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

    handleGiveHost(user) {
        this.socket.emit("give-host", user);
    }

    handleRemovePlayer(user) {
        this.socket.emit("remove-player", user);
    }

    handleGiveBlackSlot(user) {
        this.socket.emit("toggle-black-slot", user);
    }

    handleChangeColor() {
        this.socket.emit("change-color");
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleClickStart() {
        if (this.state.phase === 0 || this.state.teamWin !== null || confirm("Game will be aborted. Are you sure?"))
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
        this.debouncedEmit("set-time", type, value || 1);
    }

    handleChangCodeWord(index, word) {
        this.debouncedEmit("set-code-word", index, word);
    }

    handleClickReady() {
        if (this.state.phase === 0)
            this.handleClickStart();
        else
            this.socket.emit("toggle-ready");
    }

    handleClickAddGuess(hack) {
        this.socket.emit("add-guess", [0, 1, 2].map((index) =>
            document.getElementById(`guess-add-${index}-${hack ? "hack" : ""}`).valueAsNumber), hack);
    }

    toggleVoteGuess(index, hack) {
        this.socket.emit("vote-guess", index, hack);
    }

    handleClickRemoveGuess(evt, index, hack) {
        evt.stopPropagation();
        this.socket.emit("remove-guess", index, hack);
    }


    handleChangeWordGuess(index, guess) {
        this.debouncedEmit("set-word-guess", index, guess);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    calcTry(team, hack) {
        if (!~this.state.spectators.indexOf(this.state.userId) && this.state.player.guesses) {
            const guesses = this.state.player[!hack ? "guesses" : "hackGuesses"];
            if (guesses.length === 0)
                return [];
            const mostVoted = (guesses.slice()).sort((a, b) => b.votes.length - a.votes.length)[0];
            if (mostVoted.votes.length >= Math.ceil(this.state[team].length / 2))
                return mostVoted.code;
            else
                return [];
        } else return [];
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
                playerTeam = ~data.black.indexOf(user) ? "black" : "white",
                enemyTeam = playerTeam === "white" ? "black" : "white",
                teamWordCodesList = [[], [], [], []],
                enemyWordCodesList = [[], [], [], []],
                teamCodes = this.calcTry(playerTeam),
                enemyCodes = this.calcTry(playerTeam, true);
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
            else if (data.phase === 1 && data[`${playerTeam}Master`] === data.userId && !~data.readyPlayers.indexOf(data.userId))
                readyButtonText = "Ready";
            else if (data.phase === 2 && !isSpectator)
                readyButtonText = "Ready";
            else if (data.phase === 1)
                readyButtonText = "Encoding";
            else if (data.phase === 2)
                readyButtonText = "Decoding";
            data.rounds.forEach((round) => {
                round[playerTeam].code.forEach((codeItem) => {
                    teamWordCodesList[codeItem - 1].push(round[playerTeam].codeWords[codeItem - 1]);
                });
                round[enemyTeam].code.forEach((codeItem) => {
                    enemyWordCodesList[codeItem - 1].push(round[enemyTeam].codeWords[codeItem - 1]);
                });
            });
            if (!data.paused) {
                let timeStart = new Date();
                this.timerTimeout = setTimeout(() => {
                    if (!this.state.paused && this.state.time > 0) {
                        let prevTime = this.state.time,
                            time = prevTime - (new Date() - timeStart);
                        this.setState(Object.assign({}, this.state, {time: time}));
                        if (this.state.timed && time < 6000 && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !parseInt(localStorage.muteSounds))
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
                        <Team color="black" data={data} game={game}
                              playerTeam={!isSpectator && playerTeam === "black"}/>
                        <div className={cs("stand", playerTeam)}>
                            {[0, 1, 2, 3].map((index) => <div
                                className={cs("stand-code", `stand-code-${index}`)}>
                                <span>{(data.player.words && hyphenate(data.player.words[index])) || "?"}</span>
                            </div>)}
                        </div>
                        <Team color="white" data={data} game={game}
                              playerTeam={!isSpectator && playerTeam === "white"}/>
                    </div>
                    <div className="timer">{data.timed ? <span className="timer-time">
                                    {(new Date(!data.teamWin
                                        ? (data.time > 0
                                            ? data.time
                                            : data.masterTime * 1000)
                                        : 0)).toUTCString().match(/(\d\d:\d\d )/)[0].trim()}
                                </span> : ""}</div>
                    <div className="main-pane">
                        <WordsInputPane data={data} game={game} color={playerTeam} codes={teamCodes}/>
                        <WordsInputPane data={data} game={game} color={enemyTeam} codes={enemyCodes} hack={true}/>
                    </div>
                    <div className="ready-button" onClick={() => this.handleClickReady()}>
                        {readyButtonText}
                        <div className="ready-markers">
                            {data.readyPlayers.filter((item) => ~data[playerTeam].indexOf(item)).map((playerId) =>
                                <div className="player-color" style={{background: data.playerColors[playerId]}}/>)}
                        </div>
                    </div>
                    <div className="words-section">
                        <div className="words-column-group">
                            {[0, 1, 2, 3].map((index) =>
                                <div className={cs("word-column", playerTeam)}>
                                    <div className="word">
                                        <div className="word-number">
                                            <i className="material-icons">vpn_key</i>
                                            {index + 1}
                                        </div>
                                        {(data.player.words && hyphenate(data.player.words[index])) ||
                                        <span className="empty-holder">&lt;Unknown&gt;</span>}
                                    </div>
                                    <div
                                        className="word-codes-list">{teamWordCodesList[index].length ? teamWordCodesList[index].map((word) =>
                                        <div className="word-code-list-item">{word ||
                                        <span className="empty-holder">&lt;Empty&gt;</span>}</div>
                                    ) : <div
                                        className="word-code-list-holder material-icons">more_horiz</div>}</div>
                                </div>
                            )}

                        </div>
                        <div className="words-column-group">
                            {[0, 1, 2, 3].map((index) =>
                                <div className={cs("word-column", enemyTeam)}>
                                    <div className="word">
                                        <div className="word-number">
                                            <i className="material-icons">vpn_key</i>
                                            {index + 1}
                                        </div>
                                        {(!isSpectator && ~[1, 2].indexOf(data.phase) && data.player.wordGuesses)
                                            ? (<input
                                                placeholder="<Unknown>"
                                                onChange={(evt) => game.handleChangeWordGuess(index, evt.target.value)}
                                                defaultValue={data.player.wordGuesses[index]}/>)
                                            : (data.player.wordGuesses && data.player.wordGuesses[index]) ||
                                            <span className="empty-holder">&lt;Unknown&gt;</span>}

                                    </div>
                                    <div
                                        className="word-codes-list">{enemyWordCodesList[index].length ? enemyWordCodesList[index].map((word) =>
                                        <div className="word-code-list-item">{word ||
                                        <span className="empty-holder">&lt;Empty&gt;</span>}</div>
                                    ) : <div
                                        className="word-code-list-holder material-icons">more_horiz</div>}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="rounds-section">
                        {data.rounds.map((round, index) =>
                            <div className="round-row">
                                <RoundTable data={data} round={round[playerTeam]} roundNum={index}
                                            color={playerTeam}/>
                                <RoundTable data={data} round={round[enemyTeam]} roundNum={index} color={enemyTeam}
                                            isEnemy={true}/>
                            </div>
                        )}
                    </div>
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
                        </div>
                        <i className="settings-hover-button material-icons">settings</i>
                    </div>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));

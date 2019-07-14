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
                self: id === data.userId,
                current: data.whiteMaster === id || data.blackMaster === id
            })}
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                <div className="player-color" style={{background: data.playerColors[id]}}
                     onClick={(evt) => !evt.stopPropagation() && (id === data.userId) && game.handleChangeColor()}/>
                {data.playerNames[id]}
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
            game = this.props.game;
        return (
            <div className={cs("team", color)}>
                <div className={cs("code", {
                    "active": data.userId === data.blackMaster
                })}>
                    {data.player.code}
                </div>
                <div className="players">
                    {data[color].map((id) => <Player id={id} data={data} game={game}/>)}
                    {!data.teamsLocked
                        ? <div onClick={() => game.handleJoinTeam(color)} className="join-team-button">Join</div>
                        : ""}
                </div>
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
            round = this.props.round;
        return (
            <div className={cs("round-table", color)}>
                {[0, 1, 2].map((index) =>
                    <div className="round-table-row">
                        <div className="round-table-code-word">
                            {round.codeWords[index] || "-"}
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
            codes = this.props.codes;
        return (
            <div className={cs("words-input", color)}>
                <div className="word-rows">
                    {[0, 1, 2].map((index) =>
                        <div className="word-row">
                            <div className="word-input">
                                {data[`${color}CodeWords`][index] || "-"}
                            </div>
                            <div className="code-input">
                                {codes[index] || "-"}
                            </div>
                        </div>
                    )}
                </div>
                <div className="guess-cols">
                    {(data.player[!hack ? "guesses" : "hackGuesses"] || []).map((guess) =>
                        <div className="guess">
                            {guess.code.map((code) => <div className="guess-code">
                                {code}
                            </div>)}
                            {guess.votes.map((vote) => <div className="guess-vote">
                                {vote}
                            </div>)}
                            <div className="guess-player">{guess.player}</div>
                        </div>
                    )}
                    {data.phase === 2
                        ? <div className="add-vote">
                            +
                        </div>
                        : ""}
                </div>
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

    constructor() {
        super();
        this.state = {
            inited: false
        };
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
                playerTeam = ~data.black.indexOf(user) ? "black" : "white",
                enemyTeam = playerTeam === "white" ? "black" : "white",
                teamWordCodesList = [[], [], [], []],
                enemyWordCodesList = [[], [], [], []],
                teamCodes = [],
                enemyCodes = [];
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
                        <Team color="black" data={data} game={game}/>
                        <div className={cs("stand", playerTeam)}>
                            {[0, 1, 2, 3].map((index) => <div
                                className={cs("stand-code", `stand-code-${index}`)}>
                                {(data.player.words && data.player.words[index]) || "?"}
                            </div>)}
                        </div>
                        <Team color="white" data={data} game={game}/>
                    </div>
                    <div className="timer">{data.timed ? <span className="timer-time">
                                    {(new Date(data.time > 0
                                        ? data.time
                                        : data.masterTime * 1000)).toUTCString().match(/(\d\d:\d\d )/)[0].trim()}
                                </span> : ""}</div>
                    <div className="main-pane">
                        <WordsInputPane data={data} game={game} color={playerTeam} codes={teamCodes}/>
                        <WordsInputPane data={data} game={game} color={enemyTeam} codes={enemyCodes} hack={true}/>
                    </div>
                    <div className="logs-pane">
                        <div className="words-section">
                            {[0, 1, 2, 3].map((index) =>
                                <div className={cs("word-column", playerTeam)}>
                                    <div className="word">{index}</div>
                                    <div className="word-codes-list">{teamWordCodesList[index].map((word) =>
                                        <div className="word-code-list-item">{word}</div>
                                    )}</div>
                                </div>
                            )}
                            {[0, 1, 2, 3].map((index) =>
                                <div className={cs("word-column", enemyTeam)}>
                                    <div className="word">{index}</div>
                                    <div className="word-codes-list">{enemyWordCodesList[index].map((word) =>
                                        <div className="word-code-list-item">{word}</div>
                                    )}</div>
                                </div>
                            )}
                        </div>
                        <div className="rounds-section">
                            {data.rounds.map((round) =>
                                <div className="round-row">
                                    <RoundTable data={data} round={round[playerTeam]} color={playerTeam}/>
                                    <RoundTable data={data} round={round[enemyTeam]} color={enemyTeam} isEnemy={trye}/>
                                </div>
                            )}
                        </div>
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

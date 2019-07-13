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
            game = this.props.game;
        return (
            <div className={cs("player", {offline: !~data.onlinePlayers.indexOf(id), self: id === data.userId})}
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                <div className="player-color" style={{background: data.playerColors[id]}}
                     onClick={(evt) => !evt.stopPropagation() && (id === data.userId) && game.handleChangeColor()}/>
                {data.playerNames[id]}
                <div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Give host"
                           onClick={(evt) => game.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
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
                    {data.teamsLocked
                        ? <div onClick={() => game.handleJoinTeam(color)} className="join-team-button">Join</div>
                        : ""}
                </div>
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
                    {data.player[!hack ? "guesses" : "hackGuesses"].map((guess) =>
                        <div className="guess">

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
        this.timerSound = new Audio("/decrypto/timer-beep.mp3");
        this.chimeSound = new Audio("/decrypto/chime.mp3");
        this.tapSound = new Audio("/decrypto/tap.mp3");
        this.timerSound.volume = 0.5;
        this.chimeSound.volume = 0.25;
        this.tapSound.volume = 0.3;
        window.hyphenate = createHyphenator(hyphenationPatternsRu);
        window.hyphenateEn = createHyphenator(hyphenationPatternsEnUs);
    }

    debouncedEmit(event, data) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, data);
        }, 100);
    }

    highlight(data) {

    }

    handleJoinTeam(color) {
        this.socket.emit("players-join", color);
    }

    handleJoinSpectators(color) {
        this.socket.emit("spectators-join");
    }

    handleGiveHost(user) {
        this.socket.emit("give-host", user);
    }

    handleRemovePlayer(user) {
        this.socket.emit("remove-player", user);
    }

    handleChangeColor() {
        this.socket.emit("change-color");
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
                playerTeam = ~data.black.indexOf(user) ? "black" : "white",
                enemyTeam = playerTeam === "white" ? "black" : "white",
                teamWordCodesList = [[], [], [], []],
                enemyWordCodesList = [[], [], [], []],
                teamCodes = [],
                enemyCodes = [];
            return (
                <div className={cs("game",
                    {
                        [`${this.state.teamWin}-win`]: this.state.teamWin,
                        timed: this.state.timed,
                        paused: this.state.paused
                    })}>
                    <Team color="black" data={data} game={game}/>
                    <div className="stand">
                        {[0, 1, 2, 3].map((index) => <div
                            className={cs("stand-code", `stand-code-${index}`)}>
                            {(data.player.code && data.player.code[index]) || "?"}
                        </div>)}
                    </div>
                    <Team color="white" data={data} game={game}/>
                    <div className="timer">0:00</div>
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
                                <div className="round">{round}</div>
                            )}
                        </div>
                    </div>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));

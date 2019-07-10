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
            id = this.props.id;
        return (
            <div className={cs("player", {offline: !~data.onlinePlayers.indexOf(id), self: id === data.userId})}
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                <div className="player-color" style={{background: data.playerColors[id]}}
                     onClick={(evt) => !evt.stopPropagation() && (id === data.userId) && this.props.handleChangeColor()}/>
                {data.playerNames[id]}
                {((~data.traitors.indexOf(id)) || data.masterTraitor === id) ? (
                    <div className="traitor-icon">
                        <i className="material-icons host-button inactive"
                           title="Traitor">
                            offline_bolt
                        </i>

                    </div>
                ) : ""}
                <div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Give host"
                           onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
                    ) : ""}
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Remove"
                           onClick={(evt) => this.props.handleRemovePlayer(id, evt)}>
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

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!parseInt(localStorage.darkThemedecrypto))
            document.body.classList.add("dark-theme");
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
        this.socket = window.socket.of("decrypto");
    }

    debouncedEmit(event, data) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, data);
        }, 100);
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
            return (
                <div className={cs("game",
                    {
                        [`${this.state.teamWin}-win`]: this.state.teamWin,
                        timed: this.state.timed,
                        paused: this.state.paused,
                        "big-mode": this.state.bigMode,
                        "tri-mode": this.state.triMode,
                        pictures: this.state.modeStarted === "pic"
                    })}>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));

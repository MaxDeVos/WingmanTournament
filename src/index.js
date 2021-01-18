const express = require('express');
const app = express();
const https = require('https');
const socket = require('socket.io')
const path = require('path');
const fs = require("fs");
const players = require('../public/players.json')
let activePlayers = {};
peers = {}

port = 443;

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
}

var server = https.createServer(options, app);
var io = socket(server);

app.use(express.static(path.join(__dirname, "../public")));

function handleRoutes(){

    configureSocketForRTC();

    io.on('connection', socket => {
        handlePlayerRoutes(socket);
        handleObserverRoutes(socket);
        handleCasterRoutes(socket);
        handleBroadcasterRoutes(socket);

        socket.on('disconnect', function() {
            if(socket === observerSocket){
                handleObserverDC(socket);
            }
            else if(socket === casterSocket1 || socket === casterSocket2){
                handleCasterDC(socket);
            }
            else if(socket === broadcasterSocket){
                handleBroadcasterDC(socket);
            }
            else if(socket === player1.socket || socket === player2.socket || socket === player3.socket || socket === player4.socket){
                handlePlayerDC(socket);
            }
        });

    });
}

function informAboutElders(socket){
    if (casterSocket1 !== undefined) {
        socket.emit('caster1-con', {socket: socket.id});
    }
    if (casterSocket2 !== undefined) {
        socket.emit('caster2-con', {socket: socket.id});
    }
    if(observerSocket !== undefined){
        socket.emit("observer-con", {socket: socket.id});
    }
    if(broadcasterSocket !== undefined){
        socket.emit("broadcaster-con", {socket: socket.id});
    }
    if (player1.socket !== undefined) {
        socket.emit('player1-con', {socket: socket.id});
    }
    if (player2.socket !== undefined) {
        socket.emit('player2-con', {socket: socket.id});
    }
    if (player3.socket !== undefined) {
        socket.emit('player3-con', {socket: socket.id});
    }
    if (player4.socket !== undefined) {
        socket.emit('player4-con', {socket: socket.id});
    }


}

handleRoutes();

app.get('/player', (req, res) => {
    res.redirect('player.html');
})

// Player
let player1 = {player: undefined, socket: undefined};
let player2 = {player: undefined, socket: undefined};
let player3 = {player: undefined, socket: undefined};
let player4 = {player: undefined, socket: undefined};

function handlePlayerRoutes(socket){
    socket.on('player-con', () => {
        console.log("Player Attempting To Connect");
        if (player1.socket === undefined) {
            console.log("Registered New Player 1!");
            socket.type = 'player';
            player1.socket = socket;
            socket.emit('player-data', {players: players, number: 1});
            socket.broadcast.emit('player1-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (player2.socket === undefined) {
            console.log("Registered New Player 2!");
            socket.type = 'player';
            player2.socket = socket;
            socket.emit('player-data', {players: players, number: 2});
            socket.broadcast.emit('player2-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (player3.socket === undefined) {
            console.log("Registered New Player 3!");
            socket.type = 'player';
            player3.socket = socket;
            socket.emit('player-data', {players: players, number: 3});
            socket.broadcast.emit('player3-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (player4.socket === undefined) {
            console.log("Registered New Player 4!");
            socket.type = 'player';
            player4.socket = socket;
            socket.emit('player-data', {players: players, number: 4});
            socket.broadcast.emit('player4-con', {socket: socket.id});
            informAboutElders(socket);
        } else {
            console.log("Rejected New Player!");
            socket.emit('player-invalid');
        }
    });
    // A player has selected a name.
    socket.on("player-selected", player => {

        // If that name is not taken, confirm it and broadcast the event.
        if(activePlayers[player.steamID64] === undefined) {

            activePlayers[player.steamID64] = player;
            socket.emit("player-selected-confirm", player);
            if (player.number === 1) {
                player1.player = player.player;
                socket.broadcast.emit("player-selected", {socket: player1.socket.id, player: player1.player});
            } else if (player.number === 2) {
                player2.player = player.player;
                socket.broadcast.emit("player-selected", {socket: player2.socket.id, player: player2.player});
            } else if (player.number === 3) {
                player3.player = player.player;
                socket.broadcast.emit("player-selected", {socket: player3.socket.id, player: player3.player});
            } else if (player.number === 4) {
                player4.player = player.player;
                socket.broadcast.emit("player-selected", {socket: player4.socket.id, player: player4.player});
            }
        }
        // If that name is taken, reject it.
        else{
            socket.emit("player-selected-reject");
        }
    });
}

function handlePlayerDC(socket){

    if(socket === player1.socket){
        console.log("Player1 Disconnected");
        socket.broadcast.emit('player1-dc');
        player1.socket = undefined;
    }
    else if(socket === player2.socket){
        console.log("Player2 Disconnected");
        socket.broadcast.emit('player2-dc');
        player2.socket = undefined;
    }
    else if(socket === player3.socket){
        console.log("Player3 Disconnected");
        socket.broadcast.emit('player3-dc');
        player3.socket = undefined;
    }
    else if(socket === player4.socket){
        console.log("Player4 Disconnected");
        socket.broadcast.emit('player4-dc');
        player4.socket = undefined;
    }
}


// Observer
let observerSocket = undefined;
app.get('/observer', (req, res) => {
    res.sendFile(path.resolve('public/observer.html'));
})

function handleObserverRoutes(socket){

    socket.on('observer-con', () => {
        console.log("Observer " + socket.id + " Attempting To Connect");
        if(observerSocket !== undefined){
            console.log("Rejected New Observer!");
            socket.emit('observer-invalid');
        }
        else{
            console.log("Registered New Observer!");
            socket.type = 'observer';
            observerSocket = socket;
            socket.broadcast.emit('observer-con', {socket: socket.id});
            informAboutElders(socket);
        }
    });
}

function handleObserverDC(socket){
    console.log("Observer Disconnected");
    socket.broadcast.emit('observer-dc');
    observerSocket = undefined;
}

// Caster
let casterSocket1 = undefined;
let casterSocket2 = undefined;
app.get('/caster', (req, res) => {
    res.sendFile(path.resolve('public/caster.html'));
})

function handleCasterRoutes(socket){

    socket.on('caster-con', () => {
        console.log("Caster " + socket.id + " Attempting To Connect");
        if (casterSocket1 === undefined) {
            console.log("Registered New Caster 1!");
            socket.type = 'caster';
            casterSocket1 = socket;
            socket.broadcast.emit('caster1-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (casterSocket2 === undefined) {
            console.log("Registered New Caster 2!");
            socket.type = 'caster';
            casterSocket2 = socket;
            socket.broadcast.emit('caster2-con', {socket: socket.id});
            informAboutElders(socket);

        } else {
            console.log("Rejected New Caster!");
            socket.emit('caster-invalid');
        }
    });
}

function handleCasterDC(socket){
    if(socket === casterSocket1){
        console.log("Caster1 Disconnected");
        socket.broadcast.emit('caster1-dc');
        casterSocket1 = undefined;
    }
    else if(socket === casterSocket2){
        console.log("Caster2 Disconnected");
        socket.broadcast.emit('caster2-dc');
        casterSocket2 = undefined;
    }
}

// Broadcaster
let broadcasterSocket = undefined;
app.get('/broadcaster', (req, res) => {
    res.redirect('broadcaster.html');
})

function handleBroadcasterRoutes(socket){
    socket.on('broadcaster-con', () => {
        console.log("Broadcaster Attempting To Connect");
        if(broadcasterSocket !== undefined){
            console.log("Rejected New Broadcaster!");
            socket.emit('broadcaster-invalid');
        }
        else{
            console.log("Registered New Broadcaster!");
            socket.type = 'broadcaster';
            broadcasterSocket = socket;
            socket.broadcast.emit('broadcaster-con', {socket: socket.id});
            informAboutElders(socket);
        }
    });
}

function handleBroadcasterDC(socket){
    console.log("Broadcaster Disconnected");
    socket.broadcast.emit('broadcaster-dc');
    broadcasterSocket = undefined;
}

require('./routes')(app)
// require('./socketController')(io)

const publicip = '134.129.53.252'
server.listen(port, () => {
    console.log(`Player: https://localhost/player.html`);
    console.log(`Observer: https://localhost/observer.html`);
    console.log(`Caster: https://localhost/caster.html`);
    console.log(`Broadcaster: https://localhost/broadcaster.html`);
    console.log('========== Public IPs ============');
    console.log(`Player: https://${publicip}/player.html`);
    console.log(`Observer: https://${publicip}/observer.html`);
    console.log(`Caster: https://${publicip}/caster.html`);
    console.log(`Broadcaster: https://${publicip}/broadcaster.html`);
})

function configureSocketForRTC(){

    io.on('connect', socket => {

        console.log('a client is connected')

        // Initiate the connection process as soon as the client connects
        socket.type = determineRefererType(socket.handshake.headers.referer);

        peers[socket.id] = socket;

        // Asking all other clients to setup the peer connection receiver
        for(let id in peers) {
            if(determinePeerCompatibility(socket, peers[id])){
                console.log('sending init receive to ' + socket.id)
                peers[id].emit('initReceive', {socket_id: socket.id, type: socket.type})
            }
        }

        /**
         * relay a peerconnection signal to a specific socket
         */
        socket.on('signal', data => {
            // console.log('sending signal from ' + socket.id + ' to ', data)
            if(!peers[data.socket_id])return
            peers[data.socket_id].emit('signal', {
                socket_id: socket.id,
                signal: data.signal
            })
        })

        /**
         * remove the disconnected peer connection from all other connected clients
         */
        socket.on('disconnect', () => {
            console.log('socket disconnected ' + socket.id)
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[socket.id]
        })

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */
        socket.on('initSend', clientData => {
            console.log('INIT SEND by ' + socket.id + ' for ' + clientData.socket_id +':'+clientData.type);
            peers[clientData.socket_id].emit('initSend', socket.id)
        })
    })
}

function determineRefererType(referer) {
    referer = String(referer);
    if (referer.includes("observer")) {
        return "observer";
    } else if (referer.includes("broadcaster")) {
        return "broadcaster";
    } else if (referer.includes("player")) {
        return "player";
    } else if(referer.includes("caster")){
        return "caster";
    }
    throw Error("Unknown Referer Type: " + referer);
}

function determinePeerCompatibility(local, remote){
    let r = false;
    if(local === remote){
        r = false;
        console.log(local.id, "==", remote.id);
    }
    else {
        if (local.type === "observer") {
            r = (remote.type === "caster");
        } else if (local.type === "caster") {
            r = (remote.type !== "player");
        } else if (local.type === "broadcaster") {
            r = (remote.type !== "observer");
        } else if (local.type === "player") {
            r = (remote.type === "broadcaster" || remote.type === "player");
        }
        // console.log("Compatibility between " + local.type + " and " + remote.type + ": " + r);
    }

    return r;
}

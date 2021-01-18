const express = require('express');
const app = express();
const https = require('https');
const socket = require('socket.io')
const path = require('path');
const fs = require("fs");
const players = require('../public/players.json')
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
            if(socket.id === observerSocket){
                handleObserverDC(socket);
            }
            else if(socket.id === casterSocket1 || socket.id === casterSocket2){
                handleCasterDC(socket);
            }
            else if(socket.id === broadcasterSocket){
                handleBroadcasterDC(socket);
            }
            else if(doesPlayerHaveSocket(socket.id)){
                handlePlayerDC(socket);
            }
        });
    });
}

function doesPlayerHaveSocket(socket){
    for(let i in player){
        if(player[i].socket === socket){
            return true;
        }
    }
    return false;
}

function isPlayerTaken(p){
    for(let i in player){
        if (player[i].player !== undefined && player[i].player.steamID64 === p.steamID64) {
            return true;
        }
    }
    return false;
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
    for(let i in player){
        if(player[i].socket !== undefined){
            socket.emit(`player${i}-con`,{socket: socket.id});
        }
    }
}

handleRoutes();

app.get('/player', (req, res) => {
    res.redirect('player.html');
})

// Player
let player = {};
player[1] = {player: {name: undefined, team: undefined, steamID64: undefined}, socket: undefined};
player[2] = {player: {name: undefined, team: undefined, steamID64: undefined}, socket: undefined};
player[3] = {player: {name: undefined, team: undefined, steamID64: undefined}, socket: undefined};
player[4] = {player: {name: undefined, team: undefined, steamID64: undefined}, socket: undefined};

function handlePlayerRoutes(socket){
    socket.on('player-con', () => {
        console.log("Player Attempting To Connect");
        for(let i in player){
            if (player[i].socket === undefined) {
                console.log("Registered New Player " + i);
                socket.type = 'player';
                player[i].socket = socket.id;
                informAboutElders(socket);
                socket.emit('player-data', {players: players, number: i, activePlayers: player});
                socket.broadcast.emit(`player${i}-con`, {socket: socket.id});
                return;
            }
        }
        console.log("Rejected New Player!");
        socket.emit('player-invalid');
    });
    // A player has selected a name.
    // selectedPlayer contains .player and .number
    socket.on("player-selected", selectedPlayer => {

        // If that name is not taken, confirm it and broadcast the event.
        if(selectedPlayer.player === undefined){
            console.log(`Player ${selectedPlayer.number} is undefined!`);
            player[selectedPlayer.number].player = {name: undefined, team: undefined, steamID64: undefined};

        }
        else{

            if(isPlayerTaken(selectedPlayer.player)){
                console.log(`Player${selectedPlayer.number} Player Change Rejected!`);
                socket.emit("player-selected-reject");
                player[selectedPlayer.number].player = {name: undefined, team: undefined, steamID64: undefined};
                for(let i in peers){
                    if(selectedPlayer.socket !== i){
                        console.log(`sending updated player cache to ${i}`);
                        peers[i].emit("player-changed-name", {socket_id: socket.id, players: player});
                    }
                }
            }
            else{
                console.log(`Player${selectedPlayer.number} Player Change Confirmed!`);
                player[selectedPlayer.number].player = selectedPlayer.player;
                socket.emit("player-selected-confirm", player[selectedPlayer.number].player);
                for(let i in peers){
                    console.log(`sending updated player cache to ${i}`);
                    peers[i].emit("player-changed-name", {socket_id: socket.id, players: player});
                }
            }

        }
    });
}

function handlePlayerDC(socket){

    for(let i in player){
        if(player[i].socket === socket.id){
            console.log(`Player${i} Disconnected`);
            socket.broadcast.emit(`player${i}-dc`);
            player[i].socket = undefined;
            player[i].player = {name: undefined, team: undefined, steamID64: undefined};
        }
    }
    return false;
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
            observerSocket = socket.id;
            informAboutElders(socket);
            socket.broadcast.emit('observer-con', {socket: socket.id});
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
            casterSocket1 = socket.id;
            informAboutElders(socket);
            socket.broadcast.emit('caster1-con', {socket: socket.id});

        } else if (casterSocket2 === undefined) {
            console.log("Registered New Caster 2!");
            socket.type = 'caster';
            casterSocket2 = socket.id;
            informAboutElders(socket);
            socket.broadcast.emit('caster2-con', {socket: socket.id});

        } else {
            console.log("Rejected New Caster!");
            socket.emit('caster-invalid');
        }
    });
}

function handleCasterDC(socket){
    if(socket.id === casterSocket1){
        console.log("Caster1 Disconnected");
        socket.broadcast.emit('caster1-dc');
        casterSocket1 = undefined;
    }
    else if(socket.id === casterSocket2){
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
            broadcasterSocket = socket.id;
            informAboutElders(socket);
            socket.broadcast.emit('broadcaster-con', {socket: socket.id});
        }
    });
}

function handleBroadcasterDC(socket){
    console.log("Broadcaster Disconnected");
    socket.broadcast.emit('broadcaster-dc');
    broadcasterSocket = undefined;
}

require('./routes')(app)

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

function packagePlayerData(id){
    let out = {};
    for(let i in player){
        if(player[i].socket !== undefined){
            if(player[i].socket === socket && player[i].socket !== id){
                out[player[i].socket] = player[i];
            }
        }
    }
    return out;
}

function configureSocketForRTC(){

    io.on('connect', socket => {

        // console.log('a client is connected')

        // Initiate the connection process as soon as the client connects
        socket.type = determineRefererType(socket.handshake.headers.referer);

        peers[socket.id] = socket;

        // Asking all other clients to setup the peer connection receiver
        for(let id in peers) {
            if(determinePeerCompatibility(socket, peers[id])){
                if(socket.type === "player"){
                    console.log(player);
                }
                // console.log('sending init receive to ' + socket.id)
                peers[id].emit('initReceive', {socket_id: socket.id, type: socket.type, players: player})
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
            // console.log('socket disconnected ' + socket.id)
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[socket.id]
        })

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */
        socket.on('initSend', clientData => {
            // console.log('INIT SEND by ' + socket.id + ' for ' + clientData.socket_id +':'+clientData.type);
            peers[clientData.socket_id].emit('initSend', {socket: socket.id, type: clientData.type})
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
        // console.log(local.id, "==", remote.id);
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

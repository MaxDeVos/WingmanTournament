const express = require('express');
const app = express();
const https = require('https');
const socket = require('socket.io')
const path = require('path');
const fs = require("fs");
const rawPlayerDatabase = require('../public/playerDatabase.json')

let playerDatabase = {};

processPlayerData();

peers = {};
port = 443;

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
}

var server = https.createServer(options, app);
var io = socket(server);

app.use(express.static(path.join(__dirname, "../public")));


let Player = class{
    constructor(socketID, name, team, steamID64) {
        this.socketId = socketID;
        this.name = name;
        this.team = team;
        this.steamID64 = steamID64;
    };
}

function updatePlayerNS(player, name, team, steamID64){
    player.name = name;
    player.team = team;
    player.steamID64 = steamID64;
}

function generateEmptyPlayer(){
    return new Player("none", "none", "none", "none");
}

function handleRoutes(){

    io.on('connection', socket => {
        handlePlayerRoutes(socket);
        handleObserverRoutes(socket);
        handleCasterRoutes(socket);
        handleBroadcasterRoutes(socket);
        configureSocketForRTC(socket);


        socket.on('disconnect', function() {
            console.log("disconnecting!");
            if(socket.id === observerSocket){
                handleObserverDC(socket);
            }
            else if(socket.id === casterSocket1 || socket.id === casterSocket2){
                handleCasterDC(socket);
            }
            else if(socket.id === broadcasterSocket){
                handleBroadcasterDC(socket);
            }
            else if(doesPlayerHaveSocketID(socket.id)){
                handlePlayerDC(socket);
            }
        });
    });
}
handleRoutes();

function doesPlayerHaveSocketID(socket){
    for(let i in activePlayers){
        if(activePlayers[i].socketId === socket){
            return true;
        }
    }
    return false;
}

function getPlayerBySocketID(socket){
    for(let i in activePlayers){
        if(activePlayers[i].socketId === socket){
            console.log("Found Player!", activePlayers[i].name);
            return activePlayers[i];
        }
    }
    console.log("Player Not Found")
    return generateEmptyPlayer();
}

function isPlayerTaken(p){
    for(let i in activePlayers){
        if (activePlayers[i] !== undefined && activePlayers[i].steamID64 === p.steamID64) {
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
    for(let i in activePlayers){
        if(activePlayers[i].socket !== undefined){
            socket.emit(`player${i}-con`,{socket: socket.id});
        }
    }
}

app.get('/player', (req, res) => {
    res.redirect('player.html');
})

// Player
let activePlayers = {};
activePlayers[1] = generateEmptyPlayer();
activePlayers[2] = generateEmptyPlayer();
activePlayers[3] = generateEmptyPlayer();
activePlayers[4] = generateEmptyPlayer();

function handlePlayerRoutes(socket){
    socket.on('player-con', () => {
        console.log("Player Attempting To Connect");
        for(let i in activePlayers){
            if (activePlayers[i].socketId === "none") {
                console.log("Registered New Player " + i);
                activePlayers[i].socketId = socket.id;
                informAboutElders(socket);
                socket.emit('player-data', {playerDatabase: playerDatabase, number: i, activePlayers: activePlayers});
                socket.broadcast.emit(`player${i}-con`, activePlayers[i]);
                return;
            }
        }
        console.log("Rejected New Player!");
        socket.emit('player-invalid');
    });
    // A player has selected a name.
    // incomingData contains .player and .number
    socket.on("player-selected", incomingData => {

        // If that name is not taken, confirm it and broadcast the event.
        if(incomingData.player === undefined){
            console.log(`Player ${incomingData.number} is undefined!`);
            activePlayers[incomingData.number] = incomingData.player;
        }
        else{

            if(isPlayerTaken(incomingData.player)){
                console.log(`Player${incomingData.number} Player Change Rejected!`);
                socket.emit("player-selected-reject");
                updatePlayerNS(activePlayers[incomingData.number], "none", "none", "none");
                for(let i in peers){
                    if(incomingData.player.socketId !== i){
                        console.log(`sending updated player cache to ${i}`);
                        peers[i].emit("player-changed-name", {socket_id: socket.id, players: activePlayers});
                    }
                }
            }
            else{
                console.log(`Player${incomingData.number} Player Change Confirmed!`);
                activePlayers[incomingData.number] = incomingData.player;
                socket.emit("player-selected-confirm", activePlayers[incomingData.number]);
                for(let i in peers){
                    console.log(`sending updated teammate to ${i}`);
                    peers[i].emit("player-changed-name", determineTeammate(getPlayerBySocketID(i)));
                }
            }

        }
    });
}

function handlePlayerDC(socket){

    for(let i in activePlayers){
        if(activePlayers[i].socketId === socket.id){
            console.log(`Player${i} Disconnected`);
            socket.broadcast.emit(`player${i}-dc`);
            activePlayers[i] = generateEmptyPlayer();
        }
    }
    return false;
}

function determineTeammate(player){
    for(let p in activePlayers){
        if(player.steamID64 !== activePlayers[p].steamID64){
            if(activePlayers[p].team === player.team){
                console.log("Teammate Found for ", player.name, ": ", activePlayers[p].name);
                let peerSocket = peers[activePlayers[p].socketId];
                console.log("Sending ", {socket_id: activePlayers[p].socketId, type: peerSocket.type});
                if(player.name === "Max"){
                    peerSocket.emit('initReceive', {socket_id: player.socketId, type: peerSocket.type});
                }
                return activePlayers[p];
            }
        }
    }
    console.log("No Teammate Found for ", player.name);
    return generateEmptyPlayer();
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

function configureSocketForRTC(socket){

    // Initiate the connection process as soon as the client connects
    socket.type = determineRefererType(socket.handshake.headers.referer);

    peers[socket.id] = socket;

    // Asking all other clients to setup the peer connection receiver
    for(let id in peers) {
        if(determinePeerCompatibility(socket, peers[id])){
            peers[id].emit('initReceive', {socket_id: socket.id, type: socket.type})
        }
    }

    addRTCListeners(socket);
}

function addRTCListeners(socket){

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
            r = (remote.type === "broadcaster");
        }
        // console.log("Compatibility between " + local.type + " and " + remote.type + ": " + r);
    }

    return r;
}

function processPlayerData(){
    let i = 0;
    for(let player in rawPlayerDatabase){
        let entry = rawPlayerDatabase[player];
        if(i % 2 == 0){
            entry.sender = true;
        }
        else{
            entry.sender = false;
        }
        playerDatabase[player] = entry;
        i++;
    }
}

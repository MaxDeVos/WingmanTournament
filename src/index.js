const express = require('express');
const app = express();
const https = require('https');
const socket = require('socket.io')
const path = require('path');
const fs = require("fs");
const playerDatabase = require('../public/playerDatabase.json')
const Player = require('./Player');
const GSIManager = require('./GSIManager');
const APIManager = require('./APIManager');
const MapSelection = require('./MapSelection');
const http = require("http")

peers = {};
let port = 443;

// Max's PC
const publicIP = '134.129.53.252'
const csgoIP = '13.58.40.89';
// AWS IP
// const publicIP = '13.58.40.89';

const options = {
    key: fs.readFileSync('private.pem'),
    cert: fs.readFileSync('certificate.pem'),
}

const server = https.createServer(options, app);
const io = socket(server);

app.use(express.static(path.join(__dirname, "../public")));

let handleRoutes;
(handleRoutes = function(){

    io.on('connection', socket => {
        handlePlayerRoutes(socket);
        handleObserverRoutes(socket);
        handleCasterRoutes(socket);
        handleBroadcasterRoutes(socket);
        handleOBSRoutes(socket);
        configureSocketForRTC(socket);

        socket.on('disconnect', function() {

            console.log(socket.id, broadcasterSocket);
            if(socket.id === observerSocket){
                handleObserverDC(socket);
            }
            else if(socket.id === casterSocket1 || socket.id === casterSocket2){
                handleCasterDC(socket);
            }
            else if(socket.id === broadcasterSocket){
                handleBroadcasterDC(socket);
            }
            else if(socket.id === obsSocket){
                handleOBSDC(socket);
            }
            else if(doesPlayerHaveSocketID(socket.id)){
                handlePlayerDC(socket);
            }
        });
    });
})();

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
    if(obsSocket !== undefined){
        socket.emit("obs-con", {socket: socket.id});
    }
    for(let i in activePlayers){
        if(activePlayers[i].socketId !== "none"){
            socket.emit(`player${i}-con`,{socket: socket.id});
        }
    }
}

app.get('/player', (req, res) => {
    res.redirect('player.html');
})

// Player
let activePlayers = {};
activePlayers[1] = Player.generateEmptyPlayer();
activePlayers[2] = Player.generateEmptyPlayer();
activePlayers[3] = Player.generateEmptyPlayer();
activePlayers[4] = Player.generateEmptyPlayer();

function handlePlayerRoutes(socket){
    socket.on('player-con', async () => {
        await GSIManager.sendCommandRCON("say WELCOME PLAYER");
        console.log("Player Attempting To Connect");
        for(let i in activePlayers){
            if (activePlayers[i].socketId === "none") {
                console.log("Registered New Player " + i);
                activePlayers[i].socketId = socket.id;
                informAboutElders(socket);
                socket.emit('player-data', {playerDatabase: playerDatabase, number: i, activePlayers: activePlayers});
                socket.broadcast.emit(`player${i}-con`, activePlayers[i]);
                MapSelection.onPlayerUpdate(activePlayers, socket);
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
                Player.updatePlayerNS(activePlayers[incomingData.number], "none", "none", "none");
                for(let i in peers){
                    if(incomingData.player.socketId !== i){
                        console.log(`sending updated player cache to ${i}`);
                        peers[i].emit("player-changed-name", {socket_id: socket.id, players: activePlayers});
                    }
                }
            }
            else{
                console.log(`Player${incomingData.number} Player Change Confirmed!`);
                if(incomingData.player.name !== "none"){
                    activePlayers[incomingData.number] = incomingData.player;
                    socket.emit("player-selected-confirm", activePlayers[incomingData.number]);
                    MapSelection.handlePlayerMapSelection(socket);
                    for(let i in peers){
                        console.log(i);
                        console.log(`sending updated teammate to ${i}`);
                        peers[i].emit("player-changed-name", determineTeammate(getPlayerBySocketID(i)));
                        peers[i].emit("update-players", {socket_id: socket.id, players: activePlayers});
                    }
                }
                else{
                    activePlayers[incomingData.number] = Player.generateEmptyPlayer();
                    socket.emit("player-selected-confirm", activePlayers[incomingData.number]);
                }

            }

        }
    });
}

function handlePlayerDC(socket){

    for(let i in activePlayers){
        if(activePlayers[i].socketId === socket.id){
            if(activePlayers[i].name !== undefined){
                console.log(`${activePlayers[i].name} (Player${i}) Disconnected`);
            }
            else{
                console.log(`Unnamed Player${i} Disconnected`);
            }
            socket.broadcast.emit(`player${i}-dc`);
            activePlayers[i] = Player.generateEmptyPlayer();
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
    socket.on('broadcaster-con', async () => {
        // await GSIManager.connectToRCON(csgoIP);
        console.log("Broadcaster Attempting To Connect");
        if(broadcasterSocket !== undefined){
            console.log("Rejected New Broadcaster!");
            socket.emit('broadcaster-invalid');
        }
        else{
            console.log("Registered New Broadcaster!");
            socket.type = 'broadcaster';
            broadcasterSocket = socket.id;
            socket.broadcast.emit('broadcaster-con', {socket: socket.id});
            socket.emit("update-players", {players:activePlayers});
            MapSelection.onBroadcasterConnect(socket);
            socket.on('start-map-selection', () => {
                MapSelection.handleBroadcasterMapSelection(activePlayers, socket);
            });
            console.log(broadcasterSocket)
            informAboutElders(socket);
        }
    });
    socket.on('start-recording', () => {
        console.log("Commanding players to start recording");
        startRecording();
    });
    socket.on('stop-recording', () => {
        console.log("Commanding players to start recording");
        stopRecording();
    });
    socket.on('pause-game', async () => {
        await GSIManager.pauseGame();
        console.log("Game Paused")
    })
    socket.on('unpause-game', async () => {
        await GSIManager.unpauseGame();
        console.log("Game Resumed")
    })
    socket.on('update-players', () =>{
        socket.emit("update-players", {players:activePlayers});
    })
    socket.on('to-obs', (data) => {
        try{
            peers[obsSocket].emit("to-obs", data);
        }catch(e){
            console.warn("No OBS Client to send data to!");
        }
    })
    socket.on('obs-command', (data) => {
        console.log("SENDING OBS COMMAND");
        try{
            peers[obsSocket].emit('obs-command', data);
        }catch (e){
            console.warn("No OBS Client to send command to!")
        }
    })
    socket.on('obs-get', (data) => {
        console.log("SENDING OBS COMMAND");
        try{
            peers[obsSocket].emit('obs-get', data);
        }catch (e){
            console.warn("No OBS Client to send command to!")
        }
    })
}

function handleBroadcasterDC(socket){
    console.log("Broadcaster Disconnected");
    socket.broadcast.emit('broadcaster-dc');
    broadcasterSocket = undefined;
}

// OBS
let obsSocket = undefined;
app.get('/obs', (req, res) => {
    res.redirect('obs.html');
})

function handleOBSRoutes(socket){
    socket.on('obs-con', () => {
        console.log("OBS Attempting To Connect");
        if(obsSocket !== undefined){
            console.log("Rejected New OBS!");
            socket.emit('obs-invalid');
        }
        else{
            console.log("Registered New OBS: ", socket.id);
            socket.type = 'obs';
            obsSocket = socket.id;
            informAboutElders(socket);
            socket.emit('broadcaster-status', broadcasterSocket);
            socket.broadcast.emit('obs-con', {socket: socket.id});
        }
    });
    socket.on('to-broadcaster', (data) => {
        console.log("SENDING TO BROADCASTER");
        try{
            console.log("SENDING ", data.event)
            peers[broadcasterSocket].emit(data.event, data.payload);
        }catch (e){
            console.warn("No Broadcaster Client to send command to!")
        }
    })
    socket.on('update-players', () =>{
        socket.emit("update-players", {players:activePlayers});
    })
    socket.on('request-team-players', (teamName) =>{
        socket.emit("response-team-players", getPlayersOnTeam(teamName));
    })
}

function handleOBSDC(socket){
    console.log("OBS Disconnected");
    socket.broadcast.emit('obs-dc');
    obsSocket = undefined;
}

require('./routes')(app)

// RTC Socket Configuration

function configureSocketForRTC(socket){

    // Initiate the connection process as soon as the client connects
    socket.type = determineRefererType(socket.handshake.headers["referer"]);

    peers[socket.id] = socket;

    // Asking all other clients to setup the peer connection receiver
    for(let id in peers) {
        if(determinePeerCompatibility(socket, peers[id])){
            peers[id].emit('initReceive', {socket_id: socket.id, type: socket.type})
        }
    }

    MapSelection.updatePeers(peers);

    addRTCListeners(socket);
}

function addRTCListeners(socket){

    /**
     * relay a peer connection signal to a specific socket
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
        try{
            peers[clientData.socket_id].emit('initSend', {socket: socket.id, type: clientData.type})
        }catch(e){
            delete peers[clientData.socket_id];
        }
    })
}

function startRecording(){
    for(let i in activePlayers){
        if(activePlayers[i]["socketId"] !== "none"){
            console.log("Telling ", activePlayers[i]["socketId"], " to start recording");
            peers[activePlayers[i].socketId].emit("start-record");
        }
    }
}

function stopRecording(){
    for(let i in activePlayers){
        if(activePlayers[i]["socketId"] !== "none"){
            console.log("Telling ", activePlayers[i]["socketId"], " to stop recording");
            peers[activePlayers[i].socketId].emit("stop-record");
        }
    }

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
    } else if(referer.includes("obs")){
        return "obs";
    }
    throw Error("Unknown Referer Type: " + referer);
}

// Utility Methods

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
            r = (remote.type === "broadcaster" || remote.type === "obs");
        } else if(local.type === "obs"){
            r = (remote.type !== "observer");
        }
        // console.log("Compatibility between " + local.type + " and " + remote.type + ": " + r);
    }

    return r;
}

function getPlayerBySocketID(socket){
    for(let i in activePlayers){
        if(activePlayers[i] === undefined) {
            activePlayers[i] = Player.generateEmptyPlayer();
        }
        if(activePlayers[i].socketId === socket){
            console.log("Found Player!", activePlayers[i].name);
            return activePlayers[i];
        }
    }
    console.log("Player Not Found")
    return Player.generateEmptyPlayer();
}

function getPlayerBySteamID(steamID){
    for(let i in activePlayers){
        if(activePlayers[i].steamID64 === steamID){
            console.log("Found Player!", activePlayers[i].name);
            return activePlayers[i];
        }
    }
    console.log("Player Not Found")
    return Player.generateEmptyPlayer();
}

function doesPlayerHaveSocketID(socket){
    for(let i in activePlayers){
        if(activePlayers[i] === undefined) {
            activePlayers[i] = Player.generateEmptyPlayer();
        }
        if(activePlayers[i].socketId === socket){
            return true;
        }
    }
    return false;
}

function isPlayerTaken(p){
    for(let i in activePlayers){
        if (activePlayers[i] !== undefined && activePlayers[i].steamID64 === p.steamID64) {
            return true;
        }
    }
    return false;
}

function getPlayersOnTeam(team){
    let out = {};
    let i = 0;
    for(let p in activePlayers){
        if(activePlayers[p].team === team){
            console.log(activePlayers[p].team);
            out[i] = activePlayers[p];
            i++;
        }
    }
    return out;
}

function determineTeammate(player){
    for(let p in activePlayers){
        if(activePlayers[p] === undefined) {
            activePlayers[p] = Player.generateEmptyPlayer();
        }
        if(player.steamID64 !== activePlayers[p].steamID64){
            if(activePlayers[p].team === player.team){
                console.log("Teammate Found for ", player.name, ": ", activePlayers[p].name);
                let peerSocket = peers[activePlayers[p].socketId];
                console.log("Sending ", {socket_id: activePlayers[p].socketId, type: peerSocket.type});
                if(activePlayers[p]["teammate"] === undefined){
                    console.log(player.name, " is emitting initReceive")
                    peerSocket.emit('initReceive', {socket_id: player.socketId, type: peerSocket.type});
                }
                Player.setTeammate(player, activePlayers[p].socketId);
                return activePlayers[p];
            }
        }
    }
    Player.clearTeammate(player);
    console.log("No Teammate Found for ", player.name);
    return Player.generateEmptyPlayer();
}

// Game-State Integration

let lastPlayer = "";
let GSIServer = http.createServer((req, res) => {
    if (req.method !== "POST") {
        res.writeHead(405)
        return res.end("Only POST requests are allowed")
    }
    let body = ""

    req.on("data", data => {
        body += data
    })

    req.on("end", async () => {
        res.end("")

        let game = JSON.parse(body)
        let currentPlayer = game.player["steamid"];
        if(currentPlayer !== lastPlayer && currentPlayer !== undefined){
            console.log("Now Observing: ", currentPlayer);
            if(peers[broadcasterSocket] !== undefined){
                peers[broadcasterSocket].emit("new-observed-player", getPlayerBySteamID(currentPlayer).socketId);
            }
            if(peers[obsSocket] !== undefined){
                peers[obsSocket].emit("new-observed-player", getPlayerBySteamID(currentPlayer).socketId);
            }
            lastPlayer = currentPlayer;
        }

        await GSIManager.update(game);

    })
});

GSIServer.listen(3254);
console.log("Started GSI Server!")


server.listen(port, () => {
    console.log('========== Public IPs ============');
    console.log(`Player: https://${publicIP}/player.html`);
    console.log(`Observer: https://${publicIP}/observer.html`);
    console.log(`Caster: https://${publicIP}/caster.html`);
    console.log(`Broadcaster: https://${publicIP}/broadcaster.html`);
})

module.exports = {activePlayers};

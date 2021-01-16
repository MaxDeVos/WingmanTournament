const express = require('express');
const app = express();
const https = require('https');
const socket = require('socket.io')
const path = require('path');
const fs = require("fs");
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
            else if(socket === player1Socket || socket === player2Socket || socket === player3Socket || socket === player4Socket){
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
    if (player1Socket !== undefined) {
        socket.emit('player1-con', {socket: socket.id});
    }
    if (player2Socket !== undefined) {
        socket.emit('player2-con', {socket: socket.id});
    }
    if (player3Socket !== undefined) {
        socket.emit('player3-con', {socket: socket.id});
    }
    if (player4Socket !== undefined) {
        socket.emit('player4-con', {socket: socket.id});
    }
}

handleRoutes();

app.get('/player', (req, res) => {
    res.redirect('player.html');
})

// Player
let player1Socket = undefined;
let player2Socket = undefined;
let player3Socket = undefined;
let player4Socket = undefined;

function handlePlayerRoutes(socket){
    socket.on('player-con', () => {
        console.log("Player Attempting To Connect");
        if (player1Socket === undefined) {
            console.log("Registered New Player 1!");
            socket.type = 'player';
            player1Socket = socket;
            socket.broadcast.emit('player1-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (player2Socket === undefined) {
            console.log("Registered New Player 2!");
            socket.type = 'player';
            player2Socket = socket;
            socket.broadcast.emit('player2-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (player3Socket === undefined) {
            console.log("Registered New Player 3!");
            socket.type = 'player';
            player3Socket = socket;
            socket.broadcast.emit('player3-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (player4Socket === undefined) {
            console.log("Registered New Player 4!");
            socket.type = 'player';
            player4Socket = socket;
            socket.broadcast.emit('player4-con', {socket: socket.id});
            informAboutElders(socket);
        } else {
            console.log("Rejected New Player!");
            socket.emit('player-invalid');
        }
    });
}

function handlePlayerDC(socket){

    if(socket === player1Socket){
        console.log("Player1 Disconnected");
        socket.broadcast.emit('player1-dc');
        player1Socket = undefined;
    }
    else if(socket === player2Socket){
        console.log("Player2 Disconnected");
        socket.broadcast.emit('player2-dc');
        player2Socket = undefined;
    }
    else if(socket === player3Socket){
        console.log("Player3 Disconnected");
        socket.broadcast.emit('player3-dc');
        player3Socket = undefined;
    }
    else if(socket === player4Socket){
        console.log("Player4 Disconnected");
        socket.broadcast.emit('player4-dc');
        player4Socket = undefined;
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
            handleCasterCall(socket);
            socket.broadcast.emit('caster2-con', {socket: socket.id});
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
            handleCasterCall(socket);
            socket.broadcast.emit('caster1-con', {socket: socket.id});
            informAboutElders(socket);

        } else if (casterSocket2 === undefined) {
            console.log("Registered New Caster 2!");
            socket.type = 'caster';
            casterSocket2 = socket;
            handleCasterCall(socket);
            socket.broadcast.emit('caster2-con', {socket: socket.id});
            informAboutElders(socket);

        } else {
            console.log("Rejected New Caster!");
            socket.emit('caster-invalid');
        }
    });
}

// Caster sends data to the Observer and Broadcaster.
function handleCasterCall(socket){
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
            console.log("socket.id is", socket.id);
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

    io.on('connection', (socket) => {
        const type = determineRefererType(socket.handshake.headers.referer);

        console.log("Handling RTC for new " + type);

        socket.type = type;

        peers[socket.id] = socket

        for(let id in peers) {
            if(determinePeerCompatibility(socket,peers[id])) {
                peers[id].emit('initReceive', socket.id)
            }
        }
        console.log('configuring socket')

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
        socket.on('initSend', init_socket_id => {
            console.log("initSend from: ", socket.id, " to: ", init_socket_id.socket);
            peers[init_socket_id.socket].emit('initSend', socket.id)
            console.log("Recieved initSend from a " + init_socket_id.type)
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
    let r = undefined;
    if(local === remote){
        r = false;
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
    }
    console.log("Compatibility between " + local.type + " and " + remote.type + ": " + r);
    return r;
}

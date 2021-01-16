const express = require('express');
const app = express();
const https = require('https');
const socket = require('socket.io')
const path = require('path');
const fs = require("fs");
port = 443;

const options = {
    key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem'),
}

var server = https.createServer(options, app);
var io = socket(server);

app.use(express.static(path.join(__dirname, "../public")));

function handleRoutes(){
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
        socket.emit('caster1-con');
    }
    if (casterSocket2 !== undefined) {
        socket.emit('caster2-con');
    }
    if(observerSocket !== undefined){
        socket.emit("observer-con");
    }
    if(broadcasterSocket !== undefined){
        socket.emit("broadcaster-con");
    }
    if (player1Socket !== undefined) {
        socket.emit('player1-con');
    }
    if (player2Socket !== undefined) {
        socket.emit('player2-con');
    }
    if (player3Socket !== undefined) {
        socket.emit('player3-con');
    }
    if (player4Socket !== undefined) {
        socket.emit('player4-con');
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
            player1Socket = socket;
            socket.broadcast.emit('player1-con');
            informAboutElders(socket);

        } else if (player2Socket === undefined) {
            console.log("Registered New Player 2!");
            player2Socket = socket;
            socket.broadcast.emit('player2-con');
            informAboutElders(socket);

        } else if (player3Socket === undefined) {
            console.log("Registered New Player 3!");
            player3Socket = socket;
            socket.broadcast.emit('player3-con');
            informAboutElders(socket);

        } else if (player4Socket === undefined) {
            console.log("Registered New Player 4!");
            player4Socket = socket;
            socket.broadcast.emit('player4-con');
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
        console.log("Observer Attempting To Connect");
        if(observerSocket !== undefined){
            console.log("Rejected New Observer!");
            socket.emit('observer-invalid');
        }
        else{
            console.log("Registered New Observer!");
            observerSocket = socket;
            socket.broadcast.emit('observer-con');
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
        console.log("Caster Attempting To Connect");
        if (casterSocket1 === undefined) {
            console.log("Registered New Caster 1!");
            casterSocket1 = socket;
            socket.broadcast.emit('caster1-con');
            informAboutElders(socket);

        } else if (casterSocket2 === undefined) {
            console.log("Registered New Caster 2!");
            casterSocket2 = socket;
            socket.broadcast.emit('caster2-con');
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
            broadcasterSocket = socket;
            socket.broadcast.emit('broadcaster-con');
            informAboutElders(socket);
        }
    });
}

function handleBroadcasterDC(socket){
    console.log("Broadcaster Disconnected");
    socket.broadcast.emit('broadcaster-dc');
    broadcasterSocket = undefined;
}

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

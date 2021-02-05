/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: Yes -> Caster
 * Video Out: No
 */

let lastObservedPlayer = "";
let localSocket;
let scenes;
let activePlayers;
let teams = {};


//====================== User Listeners ============================

function createUserListener(name, socket){
    socket.on(`${name}-con`, () => {
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    socket.on(`${name}-dc`, () => {
        document.getElementById(`${name}-status`).style = "color:red";
        document.getElementById(`${name}-status`).innerHTML = "Disconnected";
    });
}

// ======================== RTC Bullshit Starts Here ============================

function sendStartGame(){
    localSocket.emit("start-game");
}

function sendRestartGame(){
    localSocket.emit("restart-game");
}

function startMapSelection(){
    localSocket.emit("start-map-selection");
}

function pauseGame(){
    rconCommand("pause");
}

function unpauseGame(){
    rconCommand("unpause");
}

function connectRCON(){
    localSocket.emit("connect-rcon");
}

function rconCommand(command){
    localSocket.emit('rcon-command', command);
}

function configUser(socket){

    localSocket = socket;

    socket.on('connect', () => {
        console.log("Connected!");
        socket.emit("broadcaster-con", function(data) {
            console.log(data);
        });
    });

    socket.on('broadcaster-invalid', () => {
        document.open();
        document.write('<h1 style="text-align: center;color:red">Caster Already Connected</h1>');
        document.close();
        socket.disconnect();
    });

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        handlePeer(remoteData.socket_id, remoteData.type, false);
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "broadcaster"})
    })

    socket.on('new-observed-player', playerSocket => {
        console.log("New Observed Player!")
        try{
            for(let i in peers){
                document.getElementById(i).style.position = "relative";
                if(i === playerSocket){
                    document.getElementById(i).style.border = "solid red 5px";
                }
                else{
                    document.getElementById(i).style.border = "solid black 1px";
                }
            }
        }catch (e){
            console.log("Error Handling Player Camera Switch: ", playerSocket);
        }
    })

    socket.on('obs-con', data => {
        console.log("OBS IS CONNECTED");
    })

    socket.on('obs-dc', data => {
        console.log("OBS DISCONNECTED");
    })

    socket.on('obs-ws-connected', data => {
        getFromOBS('GetSceneList', 'updateSceneButtons');
        console.log("OBS WS IS CONNECTED");
    })

    socket.on('updateSceneButtons', data=>{
        scenes = data.scenes;
        createSceneButtons(scenes);
    })

    socket.on('obs-ws-disconnected', data => {
        console.log("OBS WS DISCONNECTED");
    })

    socket.on('game-over', () =>{
        updateStatus("Map Ended!");
        console.log("CHANGING MAP NOW")
        socket.emit('map-over');
    })

    socket.on('map-selection-complete', (maps) =>{
        socket.emit('map-selection-confirm', (maps));
    })

    configSockets(socket);

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);
    createUserListener('obs', socket);
    createUserListener('player1', socket);
    createUserListener('player2', socket);
    createUserListener('player3', socket);
    createUserListener('player4', socket);
    createUserListener('rcon', socket);

}

function populatePlayerNames(data){

    console.log("POPULATING PLAYER NAMES FUCKERS");
    for(let a in data){
        if(peers[data[a].socketId] !== undefined){
            setPlayerName(data[a].socketId, data[a].name);
            if(!teams[data[a].team]){
                teams[data[a].team] = true;
                createTeamCamButton(data[a].team);
            }
        }
    }

}

function updatePlayers(callback){
    localSocket.emit("update-players");
    localSocket.on("update-players", data =>{
        callback(data.players);
    })

}

function createSceneButtons(scenes){
    let controls = document.getElementById("scene-controls");
    for(let scene in scenes){
        console.log(scenes[scene]);
        let sceneName = scenes[scene].name;
        let button = document.createElement("button");
        button.className = "settings";
        button.id = `${sceneName}_button`;
        button.innerText = sceneName;
        button.addEventListener("click", ()=>{
            obsCommand('SetCurrentScene', {
                'scene-name': sceneName
            });
        })
        controls.appendChild(button);
    }
}

function createTeamCamButton(team){
    let scenes = document.getElementById("camera-controls");
    let button = document.createElement("button");
    button.className = "settings";
    button.id = `${team}_button`;
    button.innerText = `${team} Cam`;
    button.addEventListener("click", ()=>{
        transmitSceneSwitch("team-cam", team);
    })
    scenes.appendChild(button);
}

function setPlayerName(socket, name){
    document.getElementById(`${socket}_title`).innerText = name;
}

function setActivePlayersCam(){
    console.log("emit active-player-cam");
    updateStatus("In Active Player Cam");
    transmitSceneSwitch("active-player-cam");
}

function setAllPlayersCam(){
    console.log("all-players-cam");
    updateStatus("In All Player Cam");
    transmitSceneSwitch("all-players-cam");
}

function setCasterCam(){
    console.log("Emit caster-cam");
    updateStatus("In Caster Cam");
    transmitSceneSwitch("caster-cam");
}

function handlePeer(socketId, type, initiator){
    if(type === "player"){
        addPeer(socketId, initiator, true, type);
    }
    else{
        addPeer(socketId, initiator, false, type);
    }
}

function handleNewFeed(newVid, socket_id, type){
    let videosDiv = document.getElementById('videos');
    console.log("YOU ARE DA BROADCASTER")
    let vidDiv = document.createElement("div");
    vidDiv.id = `${socket_id}_cont`;
    vidDiv.className = "feedContainer";
    let title = document.createElement("div");
    title.id = `${socket_id}_title`;
    title.className = "feedTitle";
    vidDiv.appendChild(title);
    vidDiv.appendChild(newVid);
    newVid.className = "broadcasterVid"
    videosDiv.appendChild(vidDiv);
}

function obsCommand(event, payload){
    localSocket.emit("obs-command", {event: event, payload: payload});
}

function relayToOBS(event, payload){
    localSocket.emit("to-obs", {event: event, payload: payload});
}

function getFromOBS(request, response, payload){
    localSocket.emit("obs-get", {event: request, response: response, payload: payload});
}

function transmitSceneSwitch(type, payload){
    localSocket.emit("to-obs", {type: type, payload: payload});
}

function updateStatus(message){
    let status = document.getElementById("status");
    status.innerHTML = message;
    status.style = "color:black";
}

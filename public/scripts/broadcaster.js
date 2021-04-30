/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: Yes -> Caster
 * Video Out: No
 */

let localSocket;
let scenes;
let teams = {};
let playerVideos = [];
let casterVideos = [];
let obsLatch = true;
let localJSON;
let mapSelectionStarted = false;


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
    if(!mapSelectionStarted){
        localSocket.emit("start-map-selection");
        let button = document.getElementById("start-map-selection");
        button.style.backgroundColor = "lightcoral";
        button.innerText = "Hide Map Selection";
        mapSelectionStarted = true;
    }
    else{
        hideMapSelection();
        let button = document.getElementById("start-map-selection");
        button.style.backgroundColor = "gray";
        button.innerText = "Sequence Complete";
    }
}

function hideMapSelection(){
    console.log("Requesting hide map selection")
    localJSON.obsDesiredScene = "CS";
    socket.emit("push-to-json", localJSON);
    relayToOBS("hide-map-selection");
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
        for(let i in peers){
            try{
                document.getElementById(i).style.position = "relative";
                if(i === playerSocket){
                    document.getElementById(i).style.border = "solid red 5px";
                }
                else{
                    document.getElementById(i).style.border = "solid black 1px";
                }
            }catch (e){
                console.log("Error Handling Player Camera Switch: ", playerSocket);
            }
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
        if(obsLatch){
            createSceneButtons(scenes);
            obsLatch = false;
        }

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

    socket.on("json-update", (jsondata) =>{
        localJSON = jsondata;
        console.log("json update bitch");
        //page updates
        updateCasterMuteVisuals(localJSON.castersMuted);

        try {
            let obsSceneButtons = document.getElementsByClassName("scene_button");
            for (var i = 0; i < obsSceneButtons.length; i++) {
                obsSceneButtons[i].style.visibility = ((localJSON.obsCountdownActive) ? "hidden" : "visible");
            }
        } catch(e) {
            console.log(e)
        }
        document.getElementById("countdown").innerHTML = "COUNTDOWN TO END OF INTRO SEQUENCE: " + localJSON.obsCountdown;
        document.getElementById("activeScene").innerHTML = "Active OBS Scene: " + localJSON.obsDesiredScene;
        document.getElementById("casterAudioLive").innerHTML = "Caster audio: " + ((localJSON.castersMuted) ? "NOT LIVE" : "ON AIR");
        document.getElementById("countdown").style.visibility = ((localJSON.obsCountdownActive) ? "visible" : "hidden");
        document.getElementById("initiateCountdown").style.visibility = ((localJSON.obsCountdownActive || localJSON.obsDesiredScene !== "WAITING") ? "hidden" : "visible");
    })

    socket.on('timeout_t', async ()=>{
        updateCasterMute(true)
    })
    socket.on('timeout_ct', async ()=>{
        updateCasterMute(true)
    })
    socket.on('timeout-over',async ()=>{
        updateCasterMute(false)
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

function countdownStart(){
    tempJSON = localJSON;
    tempJSON.queueCountdown = true;
    document.getElementById("initiateCountdown").style.visibility = "hidden";
    localSocket.emit("push-to-json", tempJSON);
}

function updatePlayers(callback){
    localSocket.emit("update-players");
    localSocket.on("update-players", data =>{
        callback(data.players);
    })

}

function createSceneButtons(scenes){
    let controls = document.getElementById("scene-controls");
    for(let scene in scenes) {
        console.log(scenes[scene]);
        let sceneName = scenes[scene].name;
        if(!sceneName.endsWith("OVERLAY") && !sceneName.startsWith("REPLAY")){
            let button = document.createElement("button");
            button.className = "scene_button";
            button.id = `${sceneName}_button`;
            button.innerText = sceneName;
            button.addEventListener("click", () => {
                localJSON.obsDesiredScene = sceneName
                localSocket.emit("push-to-json", localJSON);
                processCameraChange(scenes[scene]);
                // obsCommand('SetCurrentScene', {
                //     'scene-name': sceneName
                // });
            })
            controls.appendChild(button);
        }
    }
}

function processCameraChange(scene){
    console.log("PROCESSING CAMERA CHANGE FOR", scene.name);
    for(let source in scene.sources){
        if(scene.sources[source].name.startsWith("CameraChange-")){
            transmitCameraSwitch(scene.sources[source].name.replace("CameraChange-",""));
            return;
        }
    }
}

function createTeamCamButton(team){
    let scenes = document.getElementById("camera-controls");
    let button = document.createElement("button");
    button.className = "settings";
    button.id = `${team}_button`;
    button.innerText = `${team} Cam`;
    button.addEventListener("click", ()=>{
        transmitCameraSwitch("team-cam", team);
    })
    scenes.appendChild(button);
}

function setPlayerName(socket, name){
    document.getElementById(`${socket}_title`).innerText = name;
}

function setNoCam(){
    console.log("emit no-cam");
    updateStatus("In No Cam");
    transmitCameraSwitch("no-cam")
}

function setActivePlayersCam(){
    console.log("emit active-player-cam");
    updateStatus("In Active Player Cam");
    transmitCameraSwitch("active-player-cam");
}

function setAllPlayersCam(){
    console.log("all-players-cam");
    updateStatus("In All Player Cam");
    transmitCameraSwitch("all-players-cam");
}

function updateCasterMuteVisuals(muted){
    if(muted){
        document.getElementById("muteCasters").style.backgroundColor = "gray";
        document.getElementById("unmuteCasters").style.backgroundColor = "#FCFCFC";
    }
    else{
        document.getElementById("muteCasters").style.backgroundColor = "#FCFCFC";
        document.getElementById("unmuteCasters").style.backgroundColor = "gray";
    }
}

function updateCasterMute(muted){
    localJSON.castersMuted = muted;
    updateCasterMuteVisuals(muted);
    localSocket.emit("push-to-json", localJSON);
}

function setCasterCam(){
    console.log("Emit caster-cam");
    updateStatus("In Caster Cam");
    transmitCameraSwitch("caster-cam");
}

function talkToPlayers(mute){
    localSocket.emit("update-broadcaster-mute-status", mute);
    for(let p in playerVideos){
        playerVideos[p].muted = mute;
    }

    if(mute){
        document.getElementById("talkToPlayers").style.backgroundColor = "white";
        document.getElementById("stopTalkToPlayers").style.backgroundColor = "gray";
    }
    else{
        document.getElementById("talkToPlayers").style.backgroundColor = "gray";
        document.getElementById("stopTalkToPlayers").style.backgroundColor = "white";
    }
}

function talkToCasters(mute){
    localSocket.emit("update-broadcaster-caster-mute-status", mute);

    if(mute){
        document.getElementById("talkToCasters").style.backgroundColor = "white";
        document.getElementById("stopTalkToCasters").style.backgroundColor = "gray";
    }
    else{
        document.getElementById("talkToCasters").style.backgroundColor = "gray";
        document.getElementById("stopTalkToCasters").style.backgroundColor = "white";
    }
}

function muteCasters(mute){
    for(let c in casterVideos){
        casterVideos[c].muted = mute;
    }

    if(mute){
        document.getElementById("locallyUnmuteCasters").style.backgroundColor = "white";
        document.getElementById("locallyMuteCasters").style.backgroundColor = "gray";
    }
    else{
        document.getElementById("locallyUnmuteCasters").style.backgroundColor = "gray";
        document.getElementById("locallyMuteCasters").style.backgroundColor = "white";
    }
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

    if(type === "player"){
        playerVideos[socket_id] = newVid;
    }

    else if(type === "caster"){
        casterVideos[socket_id] = newVid;
    }

}

function obsCommand(event, payload){
    localSocket.emit("obs-command", {event: event, payload: payload});
}

function relayToOBS(event, payload){
    localSocket.emit("to-obs-as-socket", {event: event, payload: payload});
}

function getFromOBS(request, response, payload){
    localSocket.emit("obs-get", {event: request, response: response, payload: payload});
}

function transmitCameraSwitch(type, payload){
    localSocket.emit("to-obs", {type: type, payload: payload});
}

function updateStatus(message){
    let status = document.getElementById("status");
    status.innerHTML = message;
    status.style = "color:black";
}

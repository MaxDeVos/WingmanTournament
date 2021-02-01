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

function sendStartRecording(){
    localSocket.emit("start-recording");
}

function sendStopRecording(){
    localSocket.emit("stop-recording");
}

function startMapSelection(){
    localSocket.emit("start-map-selection");
}

function pauseGame(){
    localSocket.emit("pause-game");
}

function unpauseGame(){
    localSocket.emit("unpause-game");
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
            console.log(e);
        }
    })

    configSockets(socket);

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);
    createUserListener('player1', socket);
    createUserListener('player2', socket);
    createUserListener('player3', socket);
    createUserListener('player4', socket);

}

function populatePlayerNames(data){

    //TODO REMOVE THIS DIPSHIT
    relayToOBS("SetCurrentScene",
        {'scene-name': "Red"});

    console.log("POPULATING PLAYER NAMES FUCKERS");
    for(let a in data){
        if(peers[data[a].socketId] !== undefined){
            setPlayerName(data[a].socketId, data[a].name);
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
            obs.send('SetCurrentScene', {
                'scene-name': sceneName
            });
        })
        controls.appendChild(button);
    }
}

function setPlayerName(socket, name){
    document.getElementById(`${socket}_title`).innerText = name;
}

function setActivePlayersCam(){
    console.log("emit active-player-cam");
    localSocket.emit("to-obs",{type: "active-player-cam"});
}

function setAllPlayersCam(){
    console.log("all-players-cam");
    localSocket.emit("to-obs",{type: "all-players-cam"});
}

function setCasterCam(){
    console.log("Emit caster-cam");
    localSocket.emit("to-obs",{type: "caster-cam"});
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

function relayToOBS(event, payload){
    localSocket.emit("obs-command", {event: event, payload: payload});
}

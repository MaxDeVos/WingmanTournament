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
let obs;

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

    obs = new OBSWebSocket();
    obs.connect({ address: 'localhost:4444'});
    obs.on('ConnectionOpened', (data) => {
        console.log("Connected!")
        obs.send('GetSceneList').then(data =>{
            scenes = data.scenes;
            createSceneButtons(scenes);
        })
    });

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

function getUpdatedPlayers(callback, socketID){
    localSocket.emit("update-players");
      localSocket.on("update-players", data =>{
          activePlayers = data.players;
          console.log("IS THIS JUST NOT OCCURING");
          console.log(activePlayers);
          callback(data.players, socketID);
      })
}

function setPlayerName(activePlayers, socket){
    if(activePlayers !== undefined){
        for(let p in activePlayers){
            console.log("Looking for player with socket ID :",activePlayers[p].socketId);
            if(activePlayers[p].socketId === socket){
                if(activePlayers[p].socketId !== "none"){
                    document.getElementById(`${activePlayers[p].socketId}_title`).innerText = activePlayers[p].name;
                }
            }
        }
    }else{
        console.log("No Active Players");
    }
}

function setCasterName(activePlayers, socket){
    if(activePlayers !== undefined){
        for(let p in activePlayers){
            console.log("Looking for player with socket ID :",activePlayers[p].socketId);
            if(activePlayers[p].socketId === socket){
                if(activePlayers[p].socketId !== "none"){
                    document.getElementById(`${activePlayers[p].socketId}_title`).innerText = "CASTER";
                    document.getElementById(`${activePlayers[p].socketId}_title`).style.fontWeight = 800;
                }
            }
        }
    }else{
        console.log("No Active Players");
    }
}

function setActivePlayersCam(){
    localSocket.emit("to-obs",{type: "active-player-cam"});
}

function setAllPlayersCam(){
    localSocket.emit("to-obs",{type: "all-players-cam"});
}

function setCasterCam(){
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

/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: No
 * Video Out: No
 */

// ======================== RTC Bullshit Starts Here ============================

let playerVideos = {};
let casterVideos = {};
let cameraState = "none";
let obs;
let broadcasterConnected = false;
let wsConnected = false;
let localSocket;

function configUser(socket){
    localSocket = socket;

    try{
        obs = new OBSWebSocket();
        obs.connect({ address: 'localhost:4444'});
        obs.on('ConnectionOpened', (data) => {
            console.log("OBS WS Connected!")
            wsConnected = true;
            relayToBroadcaster("obs-ws-connected");
        });
    }catch(e){
        console.warn("Couldn't connect to OBS!");
    }

    obs.on('GetSceneList', data => {
        console.log("GOT SOME DATA!!!")
        console.log(data);
    })

    socket.on('connect', () => {
        console.log("NodeJS Connected!");
        socket.emit("obs-con", function(data) {
            console.log(data);
        });
    });

    // Handle if disconnects while OBS is connected
    socket.on('broadcaster-dc', () =>{
        console.log("Broadcaster Disconnected!");
        broadcasterConnected = false;
    })

    // Handle if connects after OBS
    socket.on('broadcaster-con', () =>{
        if(wsConnected){
            relayToBroadcaster("obs-ws-connected");
        }
        console.log("Broadcaster Connected!");
        broadcasterConnected = true;
    })

    socket.on('obs-invalid', () => {
        document.open();
        document.write('<h1 style="text-align: center;color:red">OBS Already Connected</h1>');
        document.close();
        socket.disconnect();
    });

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        handlePeer(remoteData.socket_id, remoteData.type, false);
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "obs"})
    })

    socket.on('new-observed-player', playerSocket => {
        console.log("Showing Player", playerSocket);
        try{
            document.getElementById("active-player").srcObject = playerVideos[playerSocket].srcObject;
        }catch (e){
            document.getElementById("active-player").srcObject = undefined;
            console.log("Error Handling Player Camera Switch: ", playerSocket);
        }
    })

    socket.on('to-obs', (data) =>{
        if(data.type === "active-player-cam"){
            console.log("Switching to Active Player Cam");
            disableCurrentCam();
            enableActivePlayerCamera();
        }
        else if(data.type === "all-players-cam"){
            console.log("Switching to All Players Cam");
            disableCurrentCam();
            enableAllPlayersCam();
        }
        else if(data.type === "caster-cam"){
            console.log("Switching to Caster Cam");
            disableCurrentCam();
            enableCasterCamera();
        }
        else if(data.type === "team-cam"){
            console.log("Switching to Team Cam");
            disableCurrentCam();
            enableTeamCam(data.payload);
        }
    })

    socket.on('obs-command', data =>{
        console.log("SENDING ", data);
        obs.send(data.event, data.payload);
    })

    socket.on("response-team-players", (data)=>{
        handleEnableTeamCam(data);
    })
}

function handlePeer(socketId, type, initiator){
    if(type === "caster"){
        addPeer(socketId, initiator, false, type);
    }
    else{
        addPeer(socketId, initiator, true, type);
    }
}

function handleNewFeed(newVid, socket_id, type){
    console.log("Handing OBS Feed", type);
    newVid.className = "vid"
    if(type === "player"){
        console.log("Appending new player to playerVideos")
        playerVideos[socket_id] = (newVid);
    }
    else if(type === "caster"){
        console.log("Appending new player to playerVideos")
        casterVideos[socket_id] = (newVid);
    }
}

function enableActivePlayerCamera(){
    let activePlayer = createVideoObject("active-player");
    activePlayer.id = "active-player";
    document.body.appendChild(activePlayer);
    cameraState = "active-player";
}

function disableActivePlayerCamera() {
    let activePlayer = document.getElementById("active-player");
    activePlayer.remove();
}

function enableCasterCamera(){
    let casterCamContainer = document.createElement("div");
    casterCamContainer.id = "casterCamContainer";

    let caster1Cam = createVideoObject("casterVideo");
    casterCamContainer.appendChild(caster1Cam);

    let caster2Cam = createVideoObject("casterVideo");
    casterCamContainer.appendChild(caster2Cam);

    let i = 0;
    for(let vid in casterVideos){
        if(i === 0){
            caster1Cam.srcObject = casterVideos[vid].srcObject;
        }
        else if(i === 1){
            caster2Cam.srcObject = casterVideos[vid].srcObject;
        }
        else{
            console.log("MORE THAN 2 CASTERS???!?!?!")
            break;
        }
        i++;
    }

    document.body.appendChild(casterCamContainer);
    cameraState = "caster";
}

function disableCasterCamera() {
    let activePlayer = document.getElementById("casterCamContainer");
    activePlayer.remove();
}

function enableAllPlayersCam(){
    let allPlayersContainer = document.createElement("div");
    allPlayersContainer.id = "allPlayersContainer";

    let cam1 = createVideoObject("allPlayersVideo")
    allPlayersContainer.appendChild(cam1);

    let cam2 = createVideoObject("allPlayersVideo")
    allPlayersContainer.appendChild(cam2);

    let cam3 = createVideoObject("allPlayersVideo")
    allPlayersContainer.appendChild(cam3);

    let cam4 = createVideoObject("allPlayersVideo")
    allPlayersContainer.appendChild(cam4);

    document.body.appendChild(allPlayersContainer);
    cameraState = "allPlayers";
}

function disableAllPlayersCam() {
    let allPlayersContainer = document.getElementById("allPlayersContainer");
    allPlayersContainer.remove();
}

function enableTeamCam(team){
    socket.emit("request-team-players", team);

    console.log("STARTING TEAM CAM");

    let teamCamContainer = document.createElement("div");
    teamCamContainer.id = "teamCamContainer";

    let player1Cam = createVideoObject("teamCamVideo");
    player1Cam.id = "player1Cam";
    teamCamContainer.appendChild(player1Cam);

    let player2Cam = createVideoObject("teamCamVideo");
    player2Cam.id = "player2Cam";
    teamCamContainer.appendChild(player2Cam);

    document.body.appendChild(teamCamContainer);
    cameraState = "teamCam";
}

function handleEnableTeamCam(players){
    let i = 0;
    console.log(players);
    for(let player in players){
        let socket = players[player].socketId;
        console.log(socket);
        if(i === 0){
            console.log(videos[socket]);
            console.log(playerVideos);
            document.getElementById("player1Cam").srcObject = videos[socket].srcObject;
        }
        else if(i === 1){
            document.getElementById("player2Cam").srcObject = videos[socket].srcObject;
        }
        else{
            console.log("MORE THAN 2 PLAYERS???!?!?!")
            break;
        }
        i++;
    }
}

function disableTeamCam(){
    let allPlayersContainer = document.getElementById("teamCamContainer");
    allPlayersContainer.remove();
}

function disableCurrentCam(){
    switch(cameraState){
        case "active-player":
            disableActivePlayerCamera();
            break;
        case "caster":
            disableCasterCamera();
            break;
        case "allPlayers":
            disableAllPlayersCam();
            break;
        case "teamCam":
            disableTeamCam();
            break;
        case "none":
            break;
        case "default":
            console.log("Unknown cameraState: ", cameraState);
    }
    cameraState = "none";
}

function createVideoObject(className){
    let videoObject = document.createElement("video");
    videoObject.className = className;
    videoObject.playsinline = false
    videoObject.autoplay = true
    return videoObject;
}

function relayToBroadcaster(event, payload){
    localSocket.emit("to-broadcaster", {event: event, payload: payload});
}

/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: No
 * Video Out: No
 */

// ======================== RTC Bullshit Starts Here ============================

let map_list = ['de_cobblestone', 'de_elysion', 'de_lake', 'de_shortnuke', 'de_guard', 'de_overpass', 'de_vertigo'];
let queuePositions = [];
let playerVideos = {};
let casterVideos = {};
let cameraState = "none";
let obs;
let broadcasterConnected = false;
let wsConnected = false;
let localSocket;
let castersMuted = true;
let localJSON;
let jsonLatch = true;

function configUser(socket){

    generateQueuePositions();

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
            castersMuted = data.muted;
            handleCasterMute(castersMuted);
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
        if(cameraState === "active-player"){
            try{
                for(let socket in playerVideos){
                    if(socket === playerSocket){
                        document.getElementById(`${socket}_feed`).style.visibility = "visible";
                    }
                    else{
                        document.getElementById(`${socket}_feed`).style.visibility = "hidden";
                    }
                }


            }catch (e){
                console.log("Error Handling Player Camera Switch: ", playerSocket);
            }
        }
    })

    socket.on('handle-mute', muted =>{
        console.log("muted:", muted);
        handleCasterMute(muted);
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
        else if(data.type === "no-cam"){
            console.log("Switching to No Cam");
            disableCurrentCam();
        }
    })

    socket.on('obs-get', req =>{
        obs.send(req.event).then(data =>{
            relayToBroadcaster(req.response, data);
        })
    })

    socket.on('obs-command', data =>{
        console.log("SENDING ", data);
        obs.send(data.event, data.payload);
    })

    socket.on("response-team-players", (data)=>{
        handleEnableTeamCam(data);
    })
    socket.on("json-update", (data)=>{
        localJSON = data;
        console.log("json update bitch");
        // if(jsonLatch){
        //     socket.emit("update-json", localJSON);
        //     jsonLatch = false;
        // }
    })

    const delay = ms => new Promise(res => setTimeout(res, ms));

    socket.on("start-map-selection", async ()=>{
        createMapSelectionObject();
        await delay(100);
        deployMaps();
    })

    socket.on('ban-spec', (maps) => {
        updateMapList(maps);
    })

    socket.on('pick-spec', (maps) => {
        updateMapList(maps);
    })

    socket.on('side-pick-spec', (maps) => {
        updateMapList(maps);
    })

    socket.on('map-selection-complete', (maps) => {
    });

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
        casterVideos[socket_id].muted = castersMuted;
    }
}

function enableActivePlayerCamera(){
    let activePlayer = document.createElement('div');
    activePlayer.id = "activePlayer";
    for(let socket in playerVideos){
        let p = createVideoObject("active-player", true);
        p.srcObject = playerVideos[socket].srcObject;
        p.id = `${socket}_feed`;
        p.class = "active-player-video";
        activePlayer.appendChild(p);
    }
    cameraState = "active-player";
    document.body.appendChild(activePlayer);

}

function disableActivePlayerCamera() {
    let activePlayer = document.getElementById("activePlayer");
    activePlayer.remove();
}

function handleCasterMute(muted){
    for(let socket in casterVideos){
        casterVideos[socket].muted = muted;
    }
}

function enableCasterCamera(){
    let casterCamContainer = document.createElement("div");
    casterCamContainer.id = "casterCamContainer";

    let caster1Cam = createVideoObject("casterVideo", false);
    casterCamContainer.appendChild(caster1Cam);

    let caster2Cam = createVideoObject("casterVideo", false);
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

    let cam1 = createVideoObject("allPlayersVideo", true);
    allPlayersContainer.appendChild(cam1);

    let cam2 = createVideoObject("allPlayersVideo", true);
    allPlayersContainer.appendChild(cam2);

    let cam3 = createVideoObject("allPlayersVideo", true);
    allPlayersContainer.appendChild(cam3);

    let cam4 = createVideoObject("allPlayersVideo", true);
    allPlayersContainer.appendChild(cam4);

    let i = 0;
    for(let player in playerVideos){
        if(i === 0){
            cam1.srcObject = playerVideos[player].srcObject;
        }
        else if(i === 1){
            cam2.srcObject = playerVideos[player].srcObject;
        }
        else if(i === 2){
            cam3.srcObject = playerVideos[player].srcObject;
        }
        else if(i === 3){
            cam4.srcObject = playerVideos[player].srcObject;
        }
        i++;
    }

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

    let player1Cam = createVideoObject("teamCamVideo", false);
    player1Cam.id = "player1Cam";
    teamCamContainer.appendChild(player1Cam);

    let player2Cam = createVideoObject("teamCamVideo", false);
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

function createVideoObject(className, muted){
    let videoObject = document.createElement("video");
    videoObject.className = className;
    videoObject.playsinline = false
    videoObject.autoplay = true
    videoObject.muted = muted;
    return videoObject;
}

function createMapSelectionObject(){
    let container = document.createElement('div');
    container.id = "mapSelectionContainer";

    let unpickedMaps = document.createElement('div');
    unpickedMaps.id = "unpickedMapsContainer";

    for(let map in map_list){
        let sName = map_list[map].replace("de_", "");
        container.appendChild(createMap(map_list[map], "Unpicked", `/media/maps/${sName}.jpg`));
    }

    container.appendChild(unpickedMaps);
    document.body.appendChild(container);

}

function createMap(map, status, image){

    let mapContainer = document.createElement('div');
    mapContainer.id = `${map}_container`;
    mapContainer.classList.add("mapContainer");

    let mapStatus = document.createElement('p');
    mapStatus.id = `${map}_status`;
    mapStatus.className = "mapStatus";
    mapStatus.innerText = status;
    mapContainer.appendChild(mapStatus);

    let mapTitle = document.createElement('p');
    mapTitle.id = `${map}_title`;
    mapTitle.className = "mapTitle";
    mapTitle.innerText = convertMapToName(map);
    mapContainer.appendChild(mapTitle);

    let mapImageGrid = document.createElement('div');
    mapImageGrid.id = `${map}_imageGrid`;
    mapImageGrid.className = "mapImageGrid";

        let mapImage = document.createElement('img');
        mapImage.id = `${map}_image`;
        mapImage.className = "mapImage";
        mapImage.src = image;
        mapImageGrid.appendChild(mapImage);

        let logo = document.createElement('img');
        logo.id = `${map}_logo`;
        logo.className = "mapLogo";
        mapImageGrid.appendChild(logo);

    mapContainer.appendChild(mapImageGrid);
    return mapContainer;
}

function convertMapToName(name){
    let string;
    if(name === "de_shortnuke"){
        string = "Nuke"
    }
    else{
        string = name.replace("de_","");
        string = string.charAt(0).toUpperCase() + string.slice(1);
    }
    return string;
}

function relayToBroadcaster(event, payload){
    localSocket.emit("to-broadcaster", {event: event, payload: payload});
}

function moveMapToPosition(map, position){
    console.log(`${map}_container`, position);
    document.getElementById(`${map}_container`).style.left = `${position}px`;
}

function generateQueuePositions(){
    for(let i = 0; i < 7; i++){
        queuePositions[i] = (i * 271);
    }
}

function deployMaps(){
    for(let map in map_list){
        moveMapToPosition(map_list[map], queuePositions[map]);
    }
}

function updateMapList(maps){
    let sortedMaps = sortMapsByRound(maps);
    let unsortedMaps = map_list;
    let finalOrder = [];
    for(let m in sortedMaps){
        let map = sortedMaps[m];

        let mapElement = document.getElementById(`${map.name}_container`);
        if(map.status === "picked"){
            mapElement.classList.add("pickedCont");
            document.getElementById(`${map.name}_status`).innerText = "Picked";
            $(`#${map.name}_container`).find('*').addClass('picked');
        }
        else if(map.status === "banned"){
            document.getElementById(`${map.name}_status`).innerText = "Banned";
            mapElement.classList.add("bannedCont");
            $(`#${map.name}_container`).find('*').addClass('banned');
        }

        let logo = document.getElementById(`${map.name}_logo`);
        logo.src = `/media/logos/${map.selector}.png`
        logo.style.visibility = "visible";

        finalOrder.push(map.name);
        for(let um in unsortedMaps){
            if(unsortedMaps[um] === map.name){
                delete unsortedMaps[um];
            }
        }
    }
    for(let m in unsortedMaps){
        finalOrder.push(unsortedMaps[m]);
    }
    map_list = finalOrder;
    deployMaps();
}

function sortMapsByRound(maps){
    let tempMaps = [];
    for(let i = 0; i < 7; i++){
        for(let m in maps){
            if(maps[m]["round"] === i){
                tempMaps[i] = maps[m];
            }
        }
    }
    return tempMaps;
}

/**
 * Status: Needs Teammate Pairing and Audio Isolation
 * Audio In: Teammate
 * Video In: None
 * Audio Out: Yes
 * Video Out: Yes
 */

let playerVideoFeeds = {};
let number;
let nameAppendLatch = true;
let broadcasterPeer;
let broadcasterVideo;
let obsPeer;
let mapSelectionRunning = false;
let localSocket = undefined;
let pickRound;

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

let player = generateEmptyPlayer();
let teammate = generateEmptyPlayer();

function generateEmptyPlayer(){
    return new Player("none", "none", "none", "none");
}

function initPlayerHandler(socket){

    socket.on('player-data', (data) => {
        player.socketId = socket.id;
        playerVideos = data.playerDatabase;
        number = data.number;
        console.log("Loaded Player Data!");
        if(nameAppendLatch){
            createPlayerList();
            nameAppendLatch = false;
        }
        else{
            // Code to automatically reselect player on server restart
            let currentSelection = document.getElementById('player-select');
            if(currentSelection.options[currentSelection.selectedIndex].value !== "none"){
                handlePlayerChange(currentSelection.value);
            }
        }
    });

    socket.on('player-selected-confirm', (data) => {
        player = data;
        console.log("Successfully Selected Player: " + data);
        updateShownPlayerData(data);
        socket.emit("player-changed-name-complete", player);
        updateInfo("Waiting For Coin Toss");
    });

    socket.on('player-selected-reject', () => {
        document.getElementById('player-select').value="Please Select Your Name";
        setEmptyPlayer(true);
        teammate = {name: "none", team: "none", steamID64: "none", socket: "none"};
        setTeammate()
    });

    socket.on('player-changed-name', teammate => {
        console.log("PLAYER CHANGED NAME!!!")
        console.log(teammate);
        setTeammate(teammate);
        for(let peer in peers){
            if(peer !== teammate.socketId && peer !== broadcasterPeer && peer !== obsPeer){
                removePeer(peer);
            }
        }
    })
}

function setEmptyPlayer(showAlert){
    updatePlayerNS(player, "none", "none", "none");
    if(showAlert){
        alert("Player Already Selected!  Please Select Another Player!")
    }
    updateShownPlayerData(player);
}

function handlePlayerChange(value){
    console.log("Attempting to select player: ", value);
    socket.emit("player-selected", {player: findPlayer(value), number: number});
    let currentSelection = document.getElementById('player-select');
    if(currentSelection.options[currentSelection.selectedIndex].value === "none"){
        setEmptyPlayer(false);
        teammate = generateEmptyPlayer();
        setTeammate()
    }
}

function updateShownPlayerData(player){
    document.getElementById("playerName").innerText = player.name;
    document.getElementById("playerTeam").innerText = player.team;
    document.getElementById("playerSteamID").innerText = player.steamID64;
}

function findPlayer(name){
    for(let i in playerVideos){
        if(i.valueOf() === name){
            let tempPlayer = playerVideos[i];
            return new Player(socket.id, tempPlayer.name, tempPlayer.team, tempPlayer.steamID64);
        }
    }
}

// ======================== RTC Bullshit Starts Here ============================

function configUser(socket){

    localSocket = socket;

    socket.on('start-record', () => {
        console.log("Recording Audio and Video!")
        startRecording();
    })

    socket.on('stop-record', () => {
        console.log("Stopped Recording Audio and Video!")
        stopRecording();
    })

    socket.on('connect', () => {
        console.log("Connected!");
        socket.emit("player-con", function(data) {
            console.log(data);
        });
    });

    socket.on('player-invalid', () => {
        document.open();
        document.write('<h1 style="text-align: center;color:red">4 Players Already Connected</h1>');
        document.close();
        socket.disconnect();
    });

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        handlePeer(remoteData.socket_id, remoteData.type, false);
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "player"})
    })

    socket.on('start-map-selection', (maps) => {
        console.log(maps)
        if(!mapSelectionRunning){
            playerStartMapSelection(maps);
        }
        mapSelectionRunning = true;
        updateMapList(maps, false);
    });

    socket.on('coin-toss', (result) => {
        console.log(result);
        if(result === "won"){
            updateInfo("You won the toss! Please choose an starting option below");
            createStartPicker();
        }
        else{
            updateInfo("Opponents won coin toss!");
        }
    });

    socket.on('coin-inform', (result) => {
        document.body.removeChild(document.getElementById("startPickContainer"));
        console.log(result);
        if(result === "map"){
            updateInfo("Opponents are banning a map");
        }
        else{
            updateInfo("Please ban a map");
        }
    });

    socket.on('coin-confirmed', (result) => {
        document.body.removeChild(document.getElementById("startPickContainer"));
    });

    socket.on('ban-map-request', (data) => {
        updateInfo("Please ban a map");
        pickRound = data.round;
        updateMapList(data.maps, true, "ban");
    });

    socket.on('ban-confirm', (data) => {
        updateInfo("Waiting on opponents to pick a map!");
        updateMapList(data.maps, false);
    })

    socket.on('pick-confirm', (data) => {
        updateInfo("Waiting on opponents to pick a side!");
        updateMapList(data.maps, false);
        try{
            document.getElementById("side-container").remove();
        }catch(e){

        }
    })

    socket.on('side-pick-request', (data) => {
        updateMapList(data.maps, false);
        updateInfo("Please pick a starting side for " + data.map + "!");
        startSideSelector(data.map);
    })

    socket.on('pick-map-request', (data) => {
        updateMapList(data.maps, true, "pick");
        updateInfo("Please pick a map!");
        try{
            document.getElementById("side-container").remove();
        }catch(e){

        }
    })

    socket.on('side-pick-confirm', (data) => {
        console.log("Side Pick Confirm");
        try{
            document.getElementById("side-container").remove();
        }catch(e){

        }
        // updateMapList(data.maps, false, "pick");
        // updateInfo(`Waiting for your opponent to ${data.next} a map!`);
    })

    socket.on('join-map-selection', maps => {
        playerStartMapSelection(maps);
        updateMapList(maps);
    })

    socket.on('opponent-pick-side', maps => {
        updateMapList(maps);
    })

    socket.on('map-selection-complete', data => {
        updateInfo("Map Selection Complete");
        updateMapList(data.maps);
    })

    socket.on('update-broadcaster-mute-status', (mute)=>{
        handleBroadcasterMute(mute);
    })


    initPlayerHandler(socket);
}

function playerStartMapSelection(maps){
    let container = document.getElementById("playerMapSelectionContainer");
    console.log(maps)
    for(let map in maps){
        let m = maps[map];
        console.log(m.name);
        let mapNameString = convertMapToName(m.name);
        let cont = document.createElement("div");
        cont.className = "playerMapContainer"
        cont.id = m.name;

            let mapBox = document.createElement("div");
            mapBox.className = "playerMapBox";

                let title = document.createElement("p");
                title.innerText = mapNameString;
                title.className = "mapTitle";
                title.id = `${m.name}_title`
                mapBox.appendChild(title);

                let image = document.createElement("img");
                image.className = "mapImage";
                image.id = `${m.name}_image`
                image.src = getMapImage(m.name);
                mapBox.appendChild(image);

                let data = document.createElement("div");
                data.className = "mapData";
                data.id = `${m.name}_data`
                mapBox.appendChild(data);

                    let selectedByTitle = document.createElement("p");
                    selectedByTitle.className = "dataTitle";
                    selectedByTitle.id = `${m.name}_selectedByTitle`;
                    data.appendChild(selectedByTitle);

                    let selectedBy = document.createElement("p");
                    selectedBy.className = "data";
                    selectedBy.id = `${m.name}_selectedBy`;
                    data.appendChild(selectedBy);

                    let yourStartingSideTitle = document.createElement("p");
                    yourStartingSideTitle.className = "dataTitle";
                    yourStartingSideTitle.id = `${m.name}_yourStartingSideTitle`;
                    data.appendChild(yourStartingSideTitle);

                    let yourStartingSide = document.createElement("p");
                    yourStartingSide.className = "data";
                    yourStartingSide.id = `${m.name}_yourStartingSide`;
                    data.appendChild(yourStartingSide);

                    let mapOrder = document.createElement("p");
                    mapOrder.className = "mapOrder";
                    mapOrder.id = `${m.name}_mapOrder`;
                    data.appendChild(mapOrder);

            let button = document.createElement("button");
            button.className = "playerButton";
            button.id = `${m.name}_button`
            button.style.visibility = "visible";
            button.innerText = title;
            cont.appendChild(mapBox);

            cont.appendChild(button);

        container.appendChild(cont);
    }
}

function changeMapButtons(m, enabled, type){
        let title = "";
        if(enabled){
            document.getElementById(`${m.name}_button`).style.visibility = "visible";
            if(type === "pick"){
                title = "Pick";
                document.getElementById(`${m.name}_button`).addEventListener("click", ()=>{
                    localSocket.emit("pick", {map:m.name, round:pickRound, team:player.team});
                });
            } else if(type === "ban"){
                title = "Ban";
                document.getElementById(`${m.name}_button`).addEventListener("click", ()=>{
                    console.log("ban");
                    localSocket.emit("ban", {map:m.name, round:pickRound, team:player.team});
                });
            }
        }
        else if(!enabled){
            // console.log(m.name);
            let button = document.getElementById(`${m.name}_button`);
            button.style.visibility = "hidden";
            let new_element = button.cloneNode(true);
            button.replaceWith(new_element);
        }
    document.getElementById(`${m.name}_button`).innerText= title;

}

function updateMapList(maps, currentlyPicking, pickType){
    for(let m in maps){
        let map = maps[m];
        console.log(map);
        if(isMapBanned(map)){
            console.log("Setting Banned to ", map.name);
            document.getElementById(map.name).style.backgroundColor = "lightcoral"
            document.getElementById(`${map.name}_selectedByTitle`).textContent = "Banned By";
            document.getElementById(`${map.name}_selectedBy`).textContent = map.selector;
            changeMapButtons(map, false);
        }
        else if(isMapPicked(map)){
            console.log("Setting Picked to ", map.name);
            document.getElementById(map.name).style.backgroundColor = "MediumSeaGreen"
            document.getElementById(`${map.name}_selectedByTitle`).textContent = "Picked By";
            document.getElementById(`${map.name}_selectedBy`).textContent = map.selector;
            document.getElementById(`${map.name}_mapOrder`).textContent = `Map #${map.order}`;
            changeMapButtons(map, false);

            if(map.ct !== undefined){
                if(map.ct === player.team){
                    document.getElementById(`${map.name}_yourStartingSideTitle`).textContent = "Your Start Side";
                    document.getElementById(`${map.name}_yourStartingSide`).textContent = "CT";
                    document.getElementById(`${map.name}_yourStartingSide`).style.fontSize = "20px";
                    document.getElementById(`${map.name}_yourStartingSide`).style.color = "navy";
                    document.getElementById(`${map.name}_yourStartingSide`).style.fontWeight = "600";
                }
                else{
                    document.getElementById(`${map.name}_yourStartingSideTitle`).textContent = "Your Start Side";
                    document.getElementById(`${map.name}_yourStartingSide`).textContent = "T";
                    document.getElementById(`${map.name}_yourStartingSide`).style.fontSize = "20px";
                    document.getElementById(`${map.name}_yourStartingSide`).style.color = "gold";
                    document.getElementById(`${map.name}_yourStartingSide`).style.fontWeight = "600";
                }
            }
        }
        else{
            // console.log("Setting Available to ", map.name);
            document.getElementById(map.name).style.backgroundColor = "white"
            changeMapButtons(map, currentlyPicking, pickType);
        }
    }
}

function createStartPicker(){

    let container = document.getElementById("startPickContainer");

    let side = document.createElement("div");
    side.id = "startPickerInner";

    let left = document.createElement("div");
    left.className = "startPickerSide";
    side.appendChild(left);
        let leftTop = document.createElement("div");
        leftTop.className = "startPickerTop";
        left.appendChild(leftTop);
            let leftTopTitle = document.createElement("h4");
            leftTopTitle.className = "startPickerTitle"
            leftTopTitle.textContent = "Ban Map First";
            leftTop.appendChild(leftTopTitle);
            let leftTopText = document.createElement("p");
            leftTopText.className = "startPickerExplanation"
            leftTopText.textContent = "Get the first ban and final map choice on tiebreaker map";
            leftTop.appendChild(leftTopText);
        let leftBottom = document.createElement("div");
        leftBottom.className = "startPickerBottom";
        left.appendChild(leftBottom);
            let leftButton = document.createElement("button");
            leftButton.className = "startPickerButton";
            leftButton.innerText = "Ban Map First";
            leftBottom.appendChild(leftButton);
            leftButton.addEventListener("click", ()=>{
                localSocket.emit("coin-response", "map");
                console.log("Chose Map!");
            });


    let right = document.createElement("div");
    right.className = "startPickerSide";
    side.appendChild(right);
        let rightTop = document.createElement("div");
        rightTop.className = "startPickerTop";
        right.appendChild(rightTop);
            let rightTopTitle = document.createElement("h4");
            rightTopTitle.class = "startPickerTitle"
            rightTopTitle.id = "startPickerRightTitle";
            rightTopTitle.textContent = "Pick Side First";
            rightTop.appendChild(rightTopTitle);
            let rightTopText = document.createElement("p");
            rightTopText.className = "startPickerExplanation"
            rightTopText.textContent = "Choose T/CT on first and third maps";
            rightTop.appendChild(rightTopText);
        let rightBottom = document.createElement("div");
        rightBottom.className = "startPickerBottom";
        right.appendChild(rightBottom);
            let rightButton = document.createElement("button");
            rightButton.className = "startPickerButton";
            rightButton.innerText = "Pick Side First";
            rightBottom.appendChild(rightButton);
            rightButton.addEventListener("click", ()=>{
                localSocket.emit("coin-response", "side");
                console.log("Chose Side!");
            });

    container.appendChild(side);

}

function startSideSelector(map){
    let outer = document.getElementById("side-picker");
    let container = document.createElement("div");
    container.id = "side-container";
    let sides = {ct: "Counter-Terrorists", t: "Terrorists"};

    let mapNameString = convertMapToName(map);
    let top = document.createElement("h3");
    top.className = "sideSelectorTop";
    top.innerText = `Pick Starting Side for ${mapNameString}`;
    container.appendChild(top);

    for(let s in sides){
        let m = sides[s];
        console.log(m);
        let cont = document.createElement("div");
        cont.className = "sideSelectorContainer"
        cont.id = `${m}_side`;

        let mapBox = document.createElement("div");
        mapBox.className = "sideSelectorBox";

        let button = document.createElement("button");
        button.className = "sidePickButton";
        button.id = `${m}_button`
        button.style.visibility = "visible";
        button.innerText = m;
        button.addEventListener("click", function(){
            console.log("Picked",m);
            socket.emit("side-pick",{side: s, map: map});
        })
        if(s === "ct"){
            cont.style.backgroundColor = "#06024a";
        }
        else{
            cont.style.backgroundColor = "#a6840a";
        }
        cont.appendChild(mapBox);

        cont.appendChild(button);

        container.appendChild(cont);

        outer.appendChild(container);
    }
}

function updateInfo(status){
    document.getElementById("info").innerText = status;
}

function setTeammate(t){
    teammate = t;
    if(teammate === undefined){
        teammate = generateEmptyPlayer();
    }
    if(teammate.name === "none"){
        document.getElementById("teammateName").style = "color:red;";
        document.getElementById("teammateName").innerText = "Not Connected!";
    }
    else{
        document.getElementById("teammateName").style = "color:green";
        document.getElementById("teammateName").innerText = teammate.name;
    }
    document.getElementById("teammateName").innerText = teammate.name;
    document.getElementById("teammateTeam").innerText = teammate.team;
    document.getElementById("teammateSteamID").innerText = teammate.steamID64;

}

function muteNonTeammates(){
    for(let p in peers){
        if(p !== undefined && p !== teammate.socket){
            console.log(`Muting ${p}`);
            mutePeer(p);
        }
    }
}

function createPlayerList(){
    let form = document.getElementById('form');
    let selection = document.getElementById('player-select');

    let defaultOption = document.createElement('option')
    defaultOption.value = "none";
    defaultOption.innerHTML = "Please Select Your Name";
    selection.add(defaultOption);

    for(let i in playerVideos){
        let option = document.createElement('option')
        option.value = i;
        option.innerHTML = i;
        selection.add(option);
    }
    form.appendChild(selection);
    document.getElementById("player-selection").appendChild(form);
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

function getMapImage(name){
    let string;
    string = name.replace("de_","");
    return "/media/maps/" + string + ".jpg";
}

function isMapAvailable(name){
    return (name.status === "available");
}

function isMapPicked(name){
    return (name.status === "picked");
}

function isMapBanned(name){
    return (name.status === "banned");
}

function handlePeer(socketId, type, initiator){
    if(type === "player"){
        console.log("ADDING OTHER PLAYER");
        addPeer(socketId, initiator, false, type);
    }
    else{
        addPeer(socketId, initiator, true, type);
        if(type === "broadcaster"){
            broadcasterPeer = socketId;
        }
        else if(type === "obs"){
            obsPeer = socketId;
        }
    }
}

function handleNewFeed(newVid, socket_id, type){

    let videosDiv = document.getElementById('videos');
    newVid.className = "vid"
    if (!noVideoInput) {
        if(type !== "broadcaster"){
            videosDiv.appendChild(newVid)
        }
    }
    if(type === "broadcaster"){
        newVid.className = "zeroVid";
        videosDiv.appendChild(newVid)
        broadcasterVideo = newVid;
    }
}

function handleBroadcasterMute(mute){
    console.log("Setting Broadcaster Mute Status To: ", mute);
    if(broadcasterVideo !== undefined){
        broadcasterVideo.muted = mute;
    }
}

/**
 * Status: Needs Teammate Pairing and Audio Isolation
 * Audio In: Teammate
 * Video In: None
 * Audio Out: Yes
 * Video Out: Yes
 */

const all_maps = ['de_cobblestone', 'de_elysion', 'de_lake', 'de_shortnuke', 'de_guard', 'de_overpass', 'de_vertigo'];
let playerDatabase = {};
let number;
let nameAppendLatch = true;
let broadcasterPeer;
let obsPeer;
let mapSelectionRunning = false;
let mapSelectorUI = {};
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
        playerDatabase = data.playerDatabase;
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
    for(let i in playerDatabase){
        if(i.valueOf() === name){
            let tempPlayer = playerDatabase[i];
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
        if(remoteData.type === "broadcaster"){
            broadcasterPeer = remoteData.socket_id;
        }
        else if(remoteData.type === "obs"){
            obsPeer = remoteData.socket_id;
        }
        console.log("INITSEND INCOMING PEER = ", peers[remoteData.socket]);
        if(remoteData.type !== "player"){
            addPeer(remoteData.socket_id, false, true);
        }
        else{
            addPeer(remoteData.socket_id, false, false);
        }
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "player"})
    })

    socket.on('start-map-selection', (maps) => {
        console.log(maps)
        if(!mapSelectionRunning){
            playerStartMapSelection(maps)
        }
        mapSelectionRunning = true;
        changeButtons(maps, true, undefined);
    });

    socket.on('coin-toss', (result) => {
        console.log(result);
        if(result === "won"){
            alert(`You won the coin toss!  Select either "Pick Side First" or 
            "Pick Map First" to proceed.`)
            updateInfo("Please choose an starting option below");
            createStartPicker();
        }
        else{
            updateInfo("Waiting on opponents");
            alert("Your opponents won the coin toss.  They are selecting between " +
                "\"Pick Side First\" and \"Pick Map First\"")
        }
    });

    socket.on('coin-inform', (result) => {
        document.body.removeChild(document.getElementById("startPickContainer"));
        console.log(result);
        if(result === "map"){
            updateInfo("Opponents are banning a map");
            alert(`Your opponents have chosen to choose a map first.`)
        }
        else{
            updateInfo("Please ban a map");
            alert(`Your opponents have chosen to choose a side first.  Please select a map.`)
        }
    });

    socket.on('coin-confirmed', (result) => {
        document.body.removeChild(document.getElementById("startPickContainer"));
    });

    socket.on('ban-map-request', (data) => {
        updateInfo("Please ban a map");
        pickRound = data.round;
        changeButtons(data.maps, true, "Ban", "ban");
    });

    socket.on('ban-confirm', (data) => {
        updateMapList(data.banned)
        changeButtons(data.picked, false);
        changeButtons(data.banned, false);
        changeButtons(data.available, false);
    })

    initPlayerHandler(socket);
}

function setTeammate(t){
    teammate = t;
    if(teammate === undefined){
        teammate = generateEmptyPlayer();
    }
    if(teammate.name === "none"){
        document.getElementById("teammateName").style = "color:red";
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

function playerStartMapSelection(maps){
    let container = document.getElementById("playerMapSelectionContainer");
    console.log(maps)
    for(let map in maps){
        let mapNameString = convertMapToName(maps[map]);
        let cont = document.createElement("div");
        cont.className = "playerMapContainer"
        cont.id = maps[map];

            let mapBox = document.createElement("div");
            mapBox.className = "playerMapBox";

                let title = document.createElement("p");
                title.innerText = mapNameString;
                title.className = "mapTitle";
                title.id = `${maps[map]}_title`
                mapBox.appendChild(title);

                let data = document.createElement("p");
                data.className = "mapData";
                data.id = `${maps[map]}_data`
                mapBox.appendChild(data);

            let button = document.createElement("button");
            button.className = "playerButton";
            button.id = `${maps[map]}_button`
            button.style.visibility = "visible";
            button.innerText = title;
            cont.appendChild(mapBox);

            cont.appendChild(button);

        container.appendChild(cont);

        mapSelectorUI[maps[map]] = {};
        mapSelectorUI[maps[map]].container = cont;
        mapSelectorUI[maps[map]].mapData = data;
        mapSelectorUI[maps[map]].mapTitle = title;
        mapSelectorUI[maps[map]].mapBox = mapBox;
        mapSelectorUI[maps[map]].button = button;
    }
}

function changeButtons(maps, enabled, title, type){
    for(let map in maps){
        if(enabled){
            mapSelectorUI[maps[map]].button.style.visibility = "visible";
            if(type === "pick"){
                document.getElementById(`${maps[map]}_button`).addEventListener("click", ()=>{
                    localSocket.emit("pick", {map:maps[map],round:pickRound});
                });
            } else if(type === "ban"){
                document.getElementById(`${maps[map]}_button`).addEventListener("click", ()=>{
                    console.log("ban");
                    localSocket.emit("ban", {map:maps[map],round:pickRound});
                });
            }
        }
        else if(!enabled){
            console.log("Looking For Button: ")
            console.log(maps[map].map);
            let button = document.getElementById(`${maps[map].map}_button`);
            button.style.visibility = "hidden";
            let new_element = button.cloneNode(true);
            button.replaceWith(new_element);
        }
        if(title === undefined){
            title = "";
        }
        console.log("what the fuck", maps[map]);
        document.getElementById(`${maps[map]}_button`).innerText= title;
    }
}

function updateMapList(banned, picked, available){
    for(let i in all_maps){
        let map = all_maps[i];
        if(banned.includes(map)){
            document.getElementById(map).style.backgroundColor = "red"
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

function updateInfo(status){
    document.getElementById("info").innerText = status;
}

function createPlayerList(){
    let form = document.getElementById('form');
    let selection = document.getElementById('player-select');

    let defaultOption = document.createElement('option')
    defaultOption.value = "none";
    defaultOption.innerHTML = "Please Select Your Name";
    selection.add(defaultOption);

    for(let i in playerDatabase){
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

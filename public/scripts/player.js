/**
 * Status: Needs Teammate Pairing and Audio Isolation
 * Audio In: Teammate
 * Video In: None
 * Audio Out: Yes
 * Video Out: Yes
 */


let playerDatabase = {};
let number;
let nameAppendLatch = true;
let activePlayers = {};

let Player = class{
    constructor(socketID, name, team, steamID64) {
        this.socketId = socketID;
        this.name = name;
        this.team = team;
        this.steamID64 = steamID64;
    };

    updatePlayerNS(name, team, steamID64){
        this.name = name;
        this.team = team;
        this.steamID64 = steamID64;
    }

    updatePlayerWS(name, team, steamID64, socketID){
        this.name = name;
        this.team = team;
        this.steamID64 = steamID64;
        this.socketId = socketID;
    }

    setSocketID(socketID){
        this.socketId = socketID;
    }

    getSocketID(){
        return this.socketId;
    }
}
let player = generateEmptyPlayer();
let teammate = generateEmptyPlayer();

function generateEmptyPlayer(){
    return new Player("none", "none", "none", "none");
}


function initPlayerHandler(socket){

    socket.on('player-data', (data) => {
        player.setSocketID(socket.id)
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
        lookForTeammates();
        socket.emit("player-changed-name-complete", player);
    });

    socket.on('player-selected-reject', () => {
        document.getElementById('player-select').value="Please Select Your Name";
        setEmptyPlayer(true);
        teammate = {name: "none", team: "none", steamID64: "none", socket: "none"};
        setTeammate()
    });

    socket.on('player-changed-name', updatedActivePlayers => {
        console.log("PLAYER CHANGED NAME!!!")
        console.log(updatedActivePlayers);
        parseNewPlayerCache(updatedActivePlayers);
        // console.log("remote data = ", remoteData);
        if(player !== undefined){
            console.log("Local Player = ", player)
            lookForTeammates();
        }
        else{
            console.log("Failed to look for teammate because no team is selected")
        }
        for(let i in peers){
            console.log(teammate.socketId, i);
            if(i === teammate.socketId){
                console.log("UNMUTING TEAMMATE", activePlayers[i].socket);
                unmutePeer(activePlayers[i].socket);
            }
            else{
                console.log("MUTING NON-TEAMMATE", activePlayers[i].socket);
                mutePeer(activePlayers[i].socket);
            }
        }
    })
}

function setEmptyPlayer(showAlert){
    player.updatePlayerNS("none", "none", "none");
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

function configUser(socket){



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
        console.log(remoteData.players);
        if(remoteData.type === "player"){
            activePlayers[remoteData.socket_id] = "empty";
        }
        addPeer(remoteData.socket_id, false)
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "player"})
    })

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);

    initPlayerHandler(socket);
}

function lookForTeammates(){
    console.log("activePlayers = ", activePlayers)
    for(let p in activePlayers){
        if(activePlayers[p].team === player.team && activePlayers[p].name !== player.name){
            teammate = activePlayers[p];
            teammate.socket = p;
            console.log("FOUND TEAMMATE!  NAME = ", activePlayers[p].name);
            setTeammate();
            return;
        }
    }
    teammate = {name: "none", team: "none", steamID64: "none", socket: "none"};
    setTeammate()
}

function setTeammate(){
    document.getElementById("teammateName").innerText = teammate.name;
    document.getElementById("teammateTeam").innerText = teammate.team;
    document.getElementById("teammateSteamID").innerText = teammate.steamID64;
}

function parseNewPlayerCache(playerData){
    for(let i = 1; i<=4; i++){
        activePlayers[playerData[i].socketId] = playerData[i];
    }
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

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
let broadcasterPeer;
let obsPeer;

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

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);

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

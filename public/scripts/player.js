/**
 * Status: Needs Teammate Pairing and Audio Isolation
 * Audio In: Teammate
 * Video In: None
 * Audio Out: Yes
 * Video Out: Yes
 */

let player;
let players;
let number;
let nameAppendLatch = true;

function initPlayerHandler(socket){

    socket.on('player-data', (data) => {
        players = data.players;
        number = data.number;
        console.log("Loaded Player Data!");
        console.log(players);
        if(nameAppendLatch){
            createPlayerList();
            nameAppendLatch = false;
        }
        else{
            // Code to automatically reselect player on server restart
            let currentSelection = document.getElementById('player-select');
            if(currentSelection.options[currentSelection.selectedIndex] !== "none"){
                handlePlayerChange(currentSelection.value);
            }
        }
    });

    socket.on('player-selected-confirm', (data) => {
        player = data;
        console.log("Successfully Selected Player: " + data);
        handlePlayerSelection(data);
    });

    socket.on('player-selected-reject', () => {
        let player = {}
        player.name = "None";
        player.team = "None";
        player.steamID64 = "None";
        console.log("Failed to Selected Player");
        alert("Player Already Selected!  Please Select Another Player!")
        handlePlayerSelection(player);
    });


}

function createPlayerList(){
    let form = document.getElementById('form');
    let selection = document.getElementById('player-select');

    let defaultOption = document.createElement('option')
    defaultOption.value = "none";
    defaultOption.innerHTML = "Please Choose A Name";
    selection.add(defaultOption);

    for(let i in players){
        let option = document.createElement('option')
        option.value = i;
        option.innerHTML = i;
        selection.add(option);
    }
    form.appendChild(selection);
    document.getElementById("player-selection").appendChild(form);
}

function handlePlayerChange(value){
    console.log("Attempting to select player: ", value);
    socket.emit("player-selected", {player: findPlayer(value), number: number});
}

function handlePlayerSelection(player){
    document.getElementById("playerName").innerText = player.name;
    document.getElementById("playerTeam").innerText = player.team;
    document.getElementById("playerSteamID").innerText = player.steamID64;
}


function findPlayer(name){
    for(let i in players){
        if(i.valueOf() === name){
            return players[i];
        }
    }
}

//====================== User Listeners ============================

function createUserListener(name, socket){
    socket.on(`${name}-con`, () => {
        document.getElementById("UUID").innerText = socket.id;
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
        addPeer(remoteData.socket_id, false)

        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "player"})
    })

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);

    initPlayerHandler(socket);
}

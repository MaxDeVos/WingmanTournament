const maps = ['de_cobblestone', 'de_elysion', 'de_lake', 'de_shortnuke', 'de_guard', 'de_overpass', 'de_vertigo'];
let availableMaps = maps;
let selectedMaps = [];
let bannedMaps = [];
let mapSelectionActive = false;
let activePlayers = {};
let broadcasterSocket = undefined;
let peers = undefined;
let teams;
let tossWinner;
let tossLoser;
let pickOrder = [];
let inversePickOrder = [];

function initMapSelection(){
    availableMaps = maps;
    selectedMaps = [];
    bannedMaps = [];
}

function banMap(map, team){
    console.log(team, "banned", map);
    if(availableMaps.includes(map)){
        bannedMaps.push({map:map, team:team});
        delete availableMaps.indexOf(map);
        return true;
    }
    else{
        return false;
    }
}

function pickMap(map, picker, ct, t){
    if(availableMaps.includes(map)){
        selectedMaps.push({map:map, team: picker, ct: ct, t: t});
        delete availableMaps.indexOf(map);
        return true;
    }
    else{
        return false;
    }
}

function getMapStartingConfig(map){
    for(let i in selectedMaps){
        if(i.map === "map"){
            return {ct: i.ct, t: i.t};
        }
    }
}

function updatePeers(p){
    peers = p;
}

function onPlayerUpdate(updatedActivePlayers, socket){
    activePlayers = updatedActivePlayers;
    if(mapSelectionActive) {
        console.log("Adding new player to map selection")
        socket.emit("start-map-selection", availableMaps);
    }
    socket.on("coin-response", (choice) => {
        console.log(tossWinner, " chose ", choice);
        emitToTeam(tossLoser, "coin-inform", choice);
        emitToTeam(tossWinner, "coin-confirmed");
        if(choice === "map"){
            pickOrder = [tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser];
            inversePickOrder = [tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser];
        } else{
            pickOrder = [tossLoser, tossWinner, tossLoser, tossWinner, tossLoser, tossWinner];
            inversePickOrder = [tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser];
        }
        emitToTeam(pickOrder[0], "ban-map-request", {maps:availableMaps, round:0});
    })
    socket.on("ban", (data)=>{
        banMap(data.map, pickOrder[data.team]);
        socket.emit("ban-confirm", {picked:selectedMaps, banned:bannedMaps, available:availableMaps});
    });
}

function handlePlayerMapSelection(socket){
    if(mapSelectionActive) {
        console.log("Adding new player to map selection")
        socket.emit("start-map-selection", availableMaps);
    }
}

function handleSpectatorMapSelection(socket){
    if(!mapSelectionActive) {
        socket.emit("start-map-selection", availableMaps);
    }
}

function onBroadcasterConnect(socket){
    broadcasterSocket = socket;
    if(mapSelectionActive) {
        console.log("Adding new player to map selection")
        socket.emit("start-map-selection", availableMaps);
    }
}

function handleBroadcasterMapSelection(updatedActivePlayers, socket){
    activePlayers = updatedActivePlayers;
    broadcasterSocket = socket;
    if(!mapSelectionActive) {
        // mapSelectionActive = true;
        console.log("Starting Map Selection!", mapSelectionActive);
        initMapSelection();
        socket.emit("start-map-selection", availableMaps);
        socket.broadcast.emit("start-map-selection", availableMaps);
        teams = determineTeams();
        if(teams !== undefined){
            if(Math.random() > .5){
                console.log(`${teams[0]} Wins The Coin Toss`);
                tossWinner = teams[0];
                emitToTeam(teams[0], "coin-toss", "won");
                tossLoser = teams[1];
                emitToTeam(teams[1], "coin-toss", "loss");
            }else{
                console.log(`${teams[1]} Wins The Coin Toss`);
                tossWinner = teams[1];
                emitToTeam(teams[1], "coin-toss", "won");
                tossLoser = teams[0];
                emitToTeam(teams[0], "coin-toss", "loss");
            }
        }
    }
}

function determineTeams(){
    let teams = [];
    for(let i in activePlayers){
        let name = activePlayers[i].team;
        if(!teams.includes(name) && name !== "none" && name !== undefined){
            teams.push(name);
        }
    }
    console.log(`FOUND ${teams.length} teams`)
    if(teams.length !== 2){
        endMapSelection();
        return undefined;
    }
    else{
        return teams;
    }
}

function emitToTeam(team, message, payload){
    for(let i in activePlayers){
        if(activePlayers[i].team === team){
            peers[activePlayers[i].socketId].emit(message, payload);
        }
    }
}

function endMapSelection(){
    console.log("Ending Map Selection!");
    mapSelectionActive = false;
    socket.broadcast.emit("end-map-selection");
    socket.emit("end-map-selection");
}

module.exports = {handlePlayerMapSelection, handleSpectatorMapSelection, onBroadcasterConnect, onPlayerUpdate, handleBroadcasterMapSelection, updatePeers}

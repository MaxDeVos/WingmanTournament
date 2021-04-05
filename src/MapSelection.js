let GSIManager = require("./GSIManager");
const APIManager = require("./APIManager");
let maps = {};
let mapSelectionActive = false;
let activePlayers = {};
let broadcasterSocket = undefined;
let peers = undefined;
let teams;
let tossWinner;
let tossLoser;
let pickOrder = [];
let inversePickOrder = [];
let mapOrder = [];
let pickConfig = ["ban","ban","pick","pick","ban","ban","auto"];
let pickRound = 0;
let currentMap = 0;
let selectionComplete = false;
let mapSelectionExport = "";

function initMapSelection(){
    maps = getEmptyMapList();
    pickOrder = [];
    inversePickOrder = [];
    mapOrder = [];
    pickRound = 0;
}

function resetMapSelection(){
    activePlayers = {};
    teams = undefined;
    tossWinner = undefined;
    tossLoser = undefined;
}

function banMap(map, team, round){
    console.log(team, "banned", map, "on round", round);
    maps[map].status = "banned";
    maps[map].selector = team;
    maps[map].round = round;
}

function pickMap(map, team, round){
    console.log(team, "picked", map, "on round", round);
    maps[map].status = "picked";
    maps[map].selector = team;
    maps[map].round = round;
    mapOrder.push(maps[map]);
    maps[map].order = mapOrder.length;
}

function setMapStartingConfig(map, team1, side1, team2){
    let m = maps[map];
    m[side1] = team1;
    if(side1 === "ct"){
        m.t = team2;
    }
    else if(side1 === "t"){
        m.ct = team2;
    }
    console.log("T: ", m.t);
    console.log("CT: ", m.ct);
    maps[map] = m;
}

function updatePeers(p){
    peers = p;
}

function onPlayerUpdate(updatedActivePlayers, socket){
    activePlayers = updatedActivePlayers;
    if(mapSelectionActive) {
        console.log("Adding new player to map selection")
        socket.emit("start-map-selection", maps);
        broadcasterSocket.broadcast.emit("map-selection-complete", maps);
        mapSelectionActive = false;
    }
    socket.on("coin-response", (choice) => {
        console.log(tossWinner, " chose ", choice);
        emitToTeam(tossLoser, "coin-inform", choice);
        emitToTeam(tossWinner, "coin-confirmed");
        if(choice === "map"){
            pickOrder = [tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser, tossWinner];
            inversePickOrder = [tossLoser, tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser];
        } else{
            pickOrder = [tossLoser, tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser];
            inversePickOrder = [tossWinner, tossLoser, tossWinner, tossLoser, tossWinner, tossLoser, tossWinner];
        }
        emitToTeam(pickOrder[0], "ban-map-request", {maps:maps, round:pickRound});
    })
    socket.on("ban", (data)=>{
        handlePlayerBan(data, socket);
    });
    socket.on("pick", (data) => {
        handlePlayerPick(data);
    })
    socket.on("side-pick", async (data) => {
        setMapStartingConfig(data.map, inversePickOrder[pickRound], data.side, pickOrder[pickRound]);
        emitToTeam(inversePickOrder[pickRound], "side-pick-confirm", {maps: maps, next: pickConfig[pickRound+1]});
        emitToTeam(pickOrder[pickRound], "opponent-pick-side", maps);
        broadcasterSocket.broadcast.emit("side-pick-spec", maps);
        broadcasterSocket.emit("side-pick-spec", maps);
        pickRound++;
        if(pickConfig[pickRound] === "pick"){
            emitToTeam(pickOrder[pickRound], "pick-map-request", {maps:maps, round:pickRound});
        }else{
            emitToTeam(pickOrder[pickRound], "ban-map-request", {maps:maps, round:pickRound});
        }
        if(pickRound === 6){
            console.log("Map Selection Completed");
            broadcasterSocket.broadcast.emit("map-selection-complete", maps);
            mapSelectionExport = await APIManager.constructMatchDatabaseFile(mapOrder);
            // console.log(mapSelectionExport);
            broadcasterSocket.emit("map-selection-complete", mapOrder);
            selectionComplete = true;
        }

    })
}

function handlePlayerBan(data){
    banMap(data.map, pickOrder[pickRound], pickRound);
    emitToTeam(pickOrder[pickRound], "ban-confirm",{maps:maps, round:pickRound})
    broadcasterSocket.broadcast.emit("ban-spec", maps);
    broadcasterSocket.emit("ban-spec", maps);
    pickRound++;
    if(pickConfig[pickRound] === "ban"){
        emitToTeam(pickOrder[pickRound], "ban-map-request",{maps:maps, round:pickRound})
    }
    else if(pickConfig[pickRound] === "pick"){
        handleRequestPick();
    }
    else if(pickConfig[pickRound] === "auto"){
        pickRound--;
        let map = getAvailableMap();
        pickMap(getAvailableMap(), inversePickOrder[pickRound], pickRound);
        maps[map].round = 6;
        emitToTeam(pickOrder[pickRound], "pick-confirm", {maps: maps, round: pickRound})
        emitToTeam(inversePickOrder[pickRound], "side-pick-request", {map: map, maps: maps, round: 6})
    }
}

function handlePlayerPick(data) {
    pickMap(data.map, pickOrder[pickRound], pickRound);
    broadcasterSocket.broadcast.emit("pick-spec", maps);
    broadcasterSocket.emit("pick-spec", maps);
    emitToTeam(pickOrder[pickRound], "pick-confirm", {maps: maps, round: pickRound})
    emitToTeam(inversePickOrder[pickRound], "side-pick-request", {map: data.map, maps: maps, round: pickRound})

}

function handleRequestPick(){
    emitToTeam(pickOrder[pickRound], "pick-map-request",{maps:maps, round:pickRound})
}

function handlePlayerMapSelection(socket){
    if(mapSelectionActive) {
        console.log("Adding new player to map selection")
        socket.emit("start-map-selection", maps);
    }
}

function handleSpectatorMapSelection(socket){
    if(!mapSelectionActive) {
        socket.emit("start-map-selection", maps);
    }
}

function onBroadcasterConnect(socket){
    broadcasterSocket = socket;
    if(mapSelectionActive) {
        console.log("Adding new player to map selection")
        socket.emit("start-map-selection", maps);
    }
}

function handleBroadcasterMapSelection(updatedActivePlayers, socket){
    activePlayers = updatedActivePlayers;
    broadcasterSocket = socket;
    if(!mapSelectionActive) {
        mapSelectionActive = true;
        console.log("Starting Map Selection!", mapSelectionActive);
        initMapSelection();
        socket.emit("start-map-selection", maps);
        socket.broadcast.emit("start-map-selection", maps);
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
    console.log(`Sending ${message} to ${team}`)
    for(let i in activePlayers){
        if(activePlayers[i].team === team){
            peers[activePlayers[i].socketId].emit(message, payload);
        }
    }
}

function endMapSelection(){
    console.log("Ending Map Selection!");
    mapSelectionActive = false;
    broadcasterSocket.broadcast.emit("end-map-selection");
    broadcasterSocket.emit("end-map-selection");
}

function getEmptyMapList(){
    console.log("Generating Map List!")
    let mapList = {};
    mapList["de_cobblestone"] = generateMap("de_cobblestone");
    mapList["de_elysion"] = generateMap("de_elysion");
    mapList["de_lake"] = generateMap('de_lake');
    mapList["de_shortnuke"] = generateMap('de_shortnuke');
    mapList["de_guard"] = generateMap('de_guard');
    mapList["de_overpass"] = generateMap('de_overpass');
    mapList["de_vertigo"] = generateMap('de_vertigo');
    return mapList;
}

function generateMap(mapName) {
    return {
        name: mapName,
        status: "available", selector: undefined,
        t: undefined, ct: undefined, round: undefined, order: undefined
    }
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

function getAvailableMap(){
    for(let map in maps){
        if(isMapAvailable(maps[map])){
            return map;
        }
    }
}

function getCurrentMap(){
    return mapOrder[currentMap];
}

function getNextMap(){
    if(mapOrder[currentMap + 1] !== undefined){
        currentMap++;
        return mapOrder[currentMap];
    }
    else{
        return "none";
    }
}

function getConfigExport(){
    if(!selectionComplete){
        return "";
    }
    else{

    }
}

async function outputTestData(){
    fakeData = [
        {
            name: 'de_lake',
            status: 'picked',
            selector: 'Fish Terrorists',
            t: 'Fish Terrorists',
            ct: 'Bimbois',
            round: 2,
            order: 1
        },
        {
            name: 'de_elysion',
            status: 'picked',
            selector: 'Bimbois',
            t: 'Fish Terrorists',
            ct: 'Bimbois',
            round: 3,
            order: 2
        },
        {
            name: 'de_cobblestone',
            status: 'picked',
            selector: 'Bimbois',
            t: 'Bimbois',
            ct: 'Fish Terrorists',
            round: 6,
            order: 3
        }
    ]

    mapSelectionExport = await APIManager.constructMatchDatabaseFile(fakeData);
}

function getSelectionExport(){
    if(mapSelectionExport !== ""){
        let out = mapSelectionExport;
        mapSelectionExport = "";
        return "map-info;" + out;
    }
    else{
        return "";
    }
}

module.exports = {handlePlayerMapSelection, handleSpectatorMapSelection, onBroadcasterConnect, onPlayerUpdate,
    handleBroadcasterMapSelection, updatePeers, getCurrentMap, getNextMap, getSelectionExport, outputTestData};

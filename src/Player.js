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

function generateEmptyPlayer(){
    return new Player("none", "none", "none", "none");
}

module.exports = {Player, updatePlayerNS, generateEmptyPlayer};

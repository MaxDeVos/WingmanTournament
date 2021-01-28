const Rcon = require('rcon-client').Rcon;
const gsiDatabase = require('../public/hudmanagerdb.json')
const APIManager = require('./APIManager');

let totalRounds = 4;
let halftimeLatch = true;
let gameoverLatch = true;
let gameStartLatch = true;
let rcon;
let rconStatus;

async function connectToRCON(address){
    rcon = new Rcon({
        host: address,
        port: 27015,
        password: "godie"
    })

    rcon.on("connect", () => {
        console.log("RCON Connected!")
        rconStatus = "connected";
    })
    rcon.on("authenticated", () => console.log("RCON Authenticated!"))
    rcon.on("end", () => {
        console.log("RCON Ended!")
        rconStatus = "disconnected";
    })

    await rcon.connect()
}

async function sendCommandRCON(command){
    if(rconStatus !== "connected"){
        console.log("RCON isn't connected!  Can't send command: ", command);
        return "";
    }
    await rcon.send(command);
}

async function update(data) {

    // Determine game state
    if (data["map"] !== undefined && data["round"] !== undefined) {
        if (data["round"]["phase"] === "freezetime" && data["map"]["round"] === 0 && gameStartLatch) {
            console.log("Game Starting!")
            gameStartLatch = false;
            console.log(await APIManager.getCurrentTeams());
        } else if (!gameStartLatch && data["round"]["phase"] !== "freezetime") {
            gameStartLatch = true;
        }
        if (data["round"]["phase"] === "freezetime" && data["map"]["round"] === totalRounds / 2 && halftimeLatch) {
            console.log("HALFTIME!")
            halftimeLatch = false;
        } else if (!halftimeLatch && data["round"]["phase"] !== "freezetime") {
            halftimeLatch = true;
        }
        if (data["map"]["phase"] === "gameover" && gameoverLatch) {
            handleGameOver();
            gameoverLatch = false;
        } else if (!gameoverLatch && data["map"]["phase"] !== "gameover") {
            gameoverLatch = true;
        }
    }
}

function handleGameOver(){
    console.log("Game Over!")
}

function getTeamFromPlayers(){

}

module.exports = {update,connectToRCON, sendCommandRCON};

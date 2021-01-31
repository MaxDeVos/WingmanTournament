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
            await handleGameOver();
            gameoverLatch = false;
        } else if (!gameoverLatch && data["map"]["phase"] !== "gameover") {
            gameoverLatch = true;
        }
    }
}

async function changeMap(map){
    await sendCommandRCON(`changelevel ${map.name};mp_teamname_1 ${map.ct};mp_teamname_2 ${map.t};rdy`);
}

async function warnStart(seconds){
    await sendCommandRCON(`say Starting Game In ${seconds} Seconds!`);
}

async function startRecording(map, stage){
    let command = "tv_record ";
    command += `${map.ct}_vs_${map.t}_${map.name}_${stage}`
    await sendCommandRCON(command)
}

async function stopRecording(){
    let command = "ew; tv_stoprecord";
    await sendCommandRCON(command);
}

async function pauseGame(){
    let command = "pause";
    await sendCommandRCON(command);
}

async function unpauseGame(){
    let command = "unpause";
    await sendCommandRCON(command);
}

async function handleGameOver(){
    await stopRecording()
    console.log("Game Over!")
}

module.exports = {update,connectToRCON, sendCommandRCON,
    changeMap, warnStart, startRecording, stopRecording, pauseGame, unpauseGame,
    handleGameOver};

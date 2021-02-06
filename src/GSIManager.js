const Rcon = require('rcon-client').Rcon;
const gsiDatabase = require('../public/hudmanagerdb.json')
const APIManager = require('./APIManager');

let totalRounds = 16;
let halftimeLatch = true;
let gameoverLatch = true;
let gameStartLatch = true;
let rcon;
let rconStatus = "disconnected";
let broadcasterSocket;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function connectToRCON(address, informed_socket){
    broadcasterSocket = informed_socket;
    rcon = new Rcon({
        host: address,
        port: 27015,
        password: "godie"
    })

    rcon.on("connect", () => {
        console.log("RCON Connected!");
        rconStatus = "connected";
        informed_socket.emit("rcon-con");
    })
    rcon.on("authenticated", () => console.log("RCON Authenticated!"))
    rcon.on("end", () => {
        console.log("RCON Disconnected!!")
        rconStatus = "disconnected";
        informed_socket.emit("rcon-dc");
    })
    rcon.on('error', (e) =>{
        console.log(e);
    })

    await rcon.connect()
}

function sendRCONStatus(socket){
    if(rconStatus === "connected"){
        socket.emit("rcon-con");
    }
    else{
        socket.emit("rcon-dc");
    }
}

async function sendCommandRCON(command){
    if(rconStatus !== "connected"){
        console.log("RCON isn't connected!  Can't send command: ", command);
    }
    else{
        await rcon.send(command);
    }
}

async function update(data) {

    // Determine game state
    if (data["map"] !== undefined && data["round"] !== undefined) {
        if (data["round"]["phase"] === "freezetime" && data["map"]["round"] === 0 && gameStartLatch) {
            console.log("Game Starting!")
            gameStartLatch = false;
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
            gameoverLatch = false;
            await handleGameOver();
        } else if (!gameoverLatch && data["map"]["phase"] === "live") {
            gameoverLatch = true;
        }
    }
}

async function changeMap(map){
    let mapName = map.name;
    if(mapName === "de_cobblestone"){
        mapName = "de_cbble"
    }
    await sendCommandRCON(`changelevel ${mapName};mp_teamname_1 ${map.ct};mp_teamname_2 ${map.t};`);
    console.log("SENDING COMMAND:", `changelevel ${mapName};mp_teamname_1 ${map.ct};mp_teamname_2 ${map.t};`);

    await delay(7500);
    await sendCommandRCON(`pw;rdy;`);
    console.log("SENDING COMMAND:", `pw;rdy;`);
}

async function warnStart(seconds){
    await sendCommandRCON(`say Starting Game In ${seconds} Seconds!`);
}

async function startGame(map, stage){
    console.log("Starting game on",map.name,"in 20 seconds!");

    //20 Second warning and wait 10 seconds
    await warnStart(20);
    await delay(10000);

    //10 Second warning and wait 5 seconds
    await warnStart(10);
    await delay(5000);

    //5 Second warning and wait 1 second
    await warnStart(5);
    await delay(1000);

    //4 Second warning and wait 1 second
    await warnStart(4);
    await delay(1000);

    //3 Second warning and wait 1 second
    await warnStart(3);
    await delay(1000);

    //2 Second warning and wait 1 second
    await warnStart(2);
    await delay(1000);

    //1 Second warning and wait 1 second
    await warnStart(1);
    await delay(1000);

    await startDemoRecording(map, stage);
    await sendCommandRCON("ew;");
    await sendCommandRCON("Starting Game!");

}

async function startDemoRecording(map, stage){
    let command = "tv_record ";
    let name = map.name;
    name = name.replace("de_","");
    command += `"${map.ct}_vs_${map.t}_${name}_${stage}"`
    await sendCommandRCON(command);
}

async function stopDemoRecording(){
    let command = "tv_stoprecord";
    await sendCommandRCON(command);
}

async function handleGameOver(){
    console.log("Game Over!", gameStartLatch);

    await delay(10000);

    broadcasterSocket.emit("game-over");
    await stopDemoRecording();
}

module.exports = {update,connectToRCON, sendCommandRCON,
    changeMap, stopDemoRecording, sendRCONStatus, startGame};

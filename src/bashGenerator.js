const playerDatabase = require('../public/playerDatabase.json')

// console.log(playerDatabase)

let latch = true;
let command = "./srcds_run -game csgo -console -usercon +game_type 0 +game_mode 2 +mapgroup mg_active +map de_vertigo " +
    "-insecure -authkey 0B004A2F322F9DDAE09B09764D909205 +host_workshop_collection 2478264583" +
    " +tv_allow_camera_man_steamid "

for (let i in playerDatabase){
    let player = playerDatabase[i];

    if(latch){
        console.log("if [[ $1 == \"" + player.name.toLowerCase() + "\" ]]; then");
        latch = false;
    }
    else{
        console.log("elif [[ $1 == \"" + player.name.toLowerCase() + "\" ]]; then");
    }
    console.log("    STEAMID=\"" + player.steamID64 + "\"");
}
console.log("else");
console.log("    echo \"PLEASE SELECT OBSERVER AND TRY AGAIN\"");
console.log("fi");

console.log(command+ "$STEAMID")

/**
 * Status: Needs Teammate Pairing and Audio Isolation
 * Audio In: Teammate
 * Video In: None
 * Audio Out: Yes
 * Video Out: Yes
 */

let sock = io();
let players;
let number;

sock.on('connect', () => {
    console.log("Connected!");
    sock.emit("player-con", function(data) {
        console.log(data);
    });
});

// socket.on('player-data', (data) => {
//     players = data.players;
//     number = data.number;
//     console.log("Loaded Player Data!");
//     console.log(players);
//     createPlayerList();
// });

sock.on('player-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">4 Players Already Connected</h1>');
    document.close();
    sock.disconnect();
});
//
// function createPlayerList(){
//     let form = document.getElementById('form');
//     let selection = document.getElementById('player-select');
//     for(let i in players){
//         let option = document.createElement('option')
//         option.value = i;
//         option.innerHTML = i;
//         selection.add(option);
//     }
//     form.appendChild(selection);
//     document.getElementById("player-selection").appendChild(form);
// }
//
// function handlePlayerChange(value){
//     console.log("New Player Selected: ", );
//     socket.emit("player-selected", {player: findPlayer(value), number: number});
// }
//
// function findPlayer(name){
//     for(let i in players){
//         if(i.valueOf() === name){
//             return players[i];
//         }
//     }
// }

// ======================= User Listeners ==============================

function createUserListener(name){
    sock.on(`${name}-con`, () => {
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    sock.on(`${name}-dc`, () => {
        document.getElementById(`${name}-status`).style = "color:red";
        document.getElementById(`${name}-status`).innerHTML = "Disconnected";
    });
}

createUserListener('observer');
createUserListener('broadcaster');
createUserListener('caster1');
createUserListener('caster2');
createUserListener('player1');
createUserListener('player2');
createUserListener('player3');
createUserListener('player4');

// ======================== RTC Bullshit Starts Here ============================

init();

socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)
    socket.emit('initSend', {socket_id: socket_id,type: "player"})
})


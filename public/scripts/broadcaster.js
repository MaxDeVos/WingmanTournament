/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: Yes -> Caster
 * Video Out: No
 */

let sock = io();
let broadcasters;
let number;

sock.on('connect', () => {
    console.log("Connected!");
    sock.emit("broadcaster-con", function(data) {
        console.log(data);
    });
});


sock.on('broadcaster-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">Broadcaster Already Connected</h1>');
    document.close();
    sock.disconnect();
});

// ======================= User Listeners ==============================

function createUserListener(name){
    sock.on(`${name}-con`, (data) => {
        console.log(`${name}-con`)
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    sock.on(`${name}-dc`, (data) => {
        console.log(`${name}-dc`)
        document.getElementById(`${name}-status`).style = "color:red";
        document.getElementById(`${name}-status`).innerHTML = "Disconnected";
    });
}

createUserListener('observer');
createUserListener('broadcaster');
createUserListener('caster1');
createUserListener('caster2');

// ======================== RTC Bullshit Starts Here ============================

init();

socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)
    socket.emit('initSend', {socket_id: socket_id,type: "broadcaster"})
})

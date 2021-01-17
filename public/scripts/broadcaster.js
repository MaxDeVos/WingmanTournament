/**
 * Audio In: Caster
 * Video In: Player
 * Audio Out: Yes -> Caster
 * Video Out: No
 */

let broadcasters;
let number;

socket.on('connect', () => {
    console.log("Connected!");
    socket.emit("broadcaster-con", function(data) {
        console.log(data);
    });
});


socket.on('broadcaster-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">Broadcaster Already Connected</h1>');
    document.close();
    socket.disconnect();
});

// ======================= User Listeners ==============================

function createUserListener(name){
    socket.on(`${name}-con`, (data) => {
        console.log(`${name}-con`)
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    socket.on(`${name}-dc`, (data) => {
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

socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)
    socket.emit('initSend', {socket: socket_id,type: "broadcaster"})
})

let constraints = {
    audio: true,
    video: false
}
startCamera(constraints);
init();

/**
 * Status: Complete
 * Audio In: Casters
 * Video In: None
 * Audio Out: No
 * Video Out: No
 */

let sock = io();

sock.on('connect', () => {
    console.log("Connected!");
    sock.emit("observer-con", function(data) {
        console.log(data);
    });
});

sock.on('observer-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">Observer Already Connected</h1>');
    document.close();
    sock.disconnect();
});

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
createUserListener('caster1');
createUserListener('caster2');

init();

socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)
    socket.emit('initSend', {socket_id: socket_id,type: "observer"})
})

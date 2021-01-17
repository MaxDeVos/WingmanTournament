/**
 * Status: Complete
 * Audio In: Casters
 * Video In: None
 * Audio Out: No
 * Video Out: No
 */

socket.on('connect', () => {
    console.log("Connected!");
    socket.emit("observer-con", function(data) {
        console.log(data);
    });
});

socket.on('observer-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">Observer Already Connected</h1>');
    document.close();
    socket.disconnect();
});

function createUserListener(name){
    socket.on(`${name}-con`, () => {
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    socket.on(`${name}-dc`, () => {
        document.getElementById(`${name}-status`).style = "color:red";
        document.getElementById(`${name}-status`).innerHTML = "Disconnected";
    });
}

createUserListener('observer');
createUserListener('caster1');
createUserListener('caster2');

socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)
    socket.emit('initSend', {socket: socket_id,type: "observer"})
})

init();

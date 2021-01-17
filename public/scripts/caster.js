/**
 * Status: Complete
 * Audio In: Caster, Broadcaster
 * Video In: None
 * Audio Out: Yes
 * Video Out: No
 */

socket.on('connect', () => {
    console.log("Connected!");
    socket.emit("caster-con", function(data) {
        console.log(data);
    });
});

socket.on('caster-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">Caster Already Connected</h1>');
    document.close();
    socket.disconnect();
});


//====================== User Listeners ============================

function createUserListener(name){
    socket.on(`${name}-con`, () => {
        document.getElementById("UUID").innerText = socket.id;
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    socket.on(`${name}-dc`, () => {
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
    socket.emit('initSend', {socket: socket_id,type: "caster"})
})

let constraints = {
    audio: true,
    video: false
}
startCamera(constraints);

init();

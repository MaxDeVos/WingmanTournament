/**
 * Status: BROKE AS FUCK
 * Audio In: Caster, Broadcaster
 * Video In: None
 * Audio Out: Yes
 * Video Out: No
 */

let sock = io();

sock.on('connect', () => {
    console.log("Connected!");
    sock.emit("caster-con", function(data) {
        console.log(data);
    });
});

sock.on('caster-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">Caster Already Connected</h1>');
    document.close();
    sock.disconnect();
});


//====================== User Listeners ============================

function createUserListener(name){
    sock.on(`${name}-con`, () => {
        document.getElementById("UUID").innerText = sock.id;
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

// ======================== RTC Bullshit Starts Here ============================


socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)
    socket.emit('initSend', {socket_id: socket_id,type: "caster"})
})

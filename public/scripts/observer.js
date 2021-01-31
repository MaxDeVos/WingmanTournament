/**
 * Status: Stable
 * Audio In: Casters
 * Video In: None
 * Audio Out: No
 * Video Out: No
 */

//====================== User Listeners ============================

function createUserListener(name, socket){
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

// ======================== RTC Bullshit Starts Here ============================

function configUser(socket){
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

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        addPeer(remoteData.socket_id, false, false, remoteData.type)

        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "observer"})
    })


    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);
}

let s = io.connect("https://localhost:2000")
s.on("connect", () => {
    console.log("GAMING");
})

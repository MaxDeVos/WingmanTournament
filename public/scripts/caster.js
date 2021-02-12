
/**
 * Status: Working
 * Audio In: Caster, Broadcaster
 * Video In: None
 * Audio Out: Yes
 * Video Out: No
 */
let localJSON;
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
        socket.emit("caster-con", function(data) {
            console.log(data);
        });
    });

    socket.on('caster-invalid', () => {
        document.open();
        document.write('<h1 style="text-align: center;color:red">2 Casters Already Connected</h1>');
        document.close();
        socket.disconnect();
    });

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        handlePeer(remoteData.socket_id, remoteData.type, false);
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "caster"})
    })
    socket.on('handle-mute', muted =>{
        handleMute(muted);
    })
    socket.on('json-update', (data)=>{
        localJSON = data;
        handleMute(localJSON.castersMuted);
        handleCountDown(localJSON);
    })

    configSockets(socket);

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);
}

function handleCountDown(json){
    document.getElementById("countDownTimer").style.visibility = ((json.obsCountdownActive) ? "visible" : "hidden");
    document.getElementById("countDownTimer").innerHTML = "TIME UNTIL ON AIR: " + json.obsCountdown;

}

function handleMute(muted){
    if(muted){
        document.getElementById("status").innerText = "Muted";
        document.getElementById("status").style.color = "red";
    }
    else{
        document.getElementById("status").innerText = "LIVE";
        document.getElementById("status").style.color = "green";
    }
}

function handlePeer(socketId, type, initiator){
    addPeer(socketId, initiator, false, type);
}

function handleNewFeed(newVid, socket_id, type){

    let videosDiv = document.getElementById('videos');
    newVid.className = "vid"
    if (!noVideoInput) {
        if(type !== "broadcaster"){
            videosDiv.appendChild(newVid)
        }
    }
}

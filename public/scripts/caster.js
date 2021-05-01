
/**
 * Status: Working
 * Audio In: Caster, Broadcaster
 * Video In: None
 * Audio Out: Yes
 * Video Out: No
 */
let localJSON;
let playerVideos = [];
let broadcasterVideo = undefined;
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

    socket.on('timeout_t', async (timeoutTeam)=>{
        console.log("T-side Timeout called from: " + timeoutTeam);
        socket.emit("request-team-players", timeoutTeam);
        document.getElementById("status").innerText = "TERRORIST TIMEOUT"
    })

    socket.on('timeout_ct', async (timeoutTeam)=>{
        console.log("CT-side Timeout called from: " + timeoutTeam);
        socket.emit("request-team-players", timeoutTeam);
        document.getElementById("status").innerText = "COUNTER-TERRORIST TIMEOUT"
    })
    socket.on('timeout-over',async ()=>{
        console.log("Timeout Over!");
        console.log("Switching to Active Player Cam");
        muteAllPlayers();
        document.getElementById("status").color = "green"
        document.getElementById("status").innerText = "Unmuted"
    })

    socket.on('response-team-players', (players) => {
        handleUnmuteTeam(players);
    })

    socket.on('update-broadcaster-mute-status', muted =>{
        console.log("BROADCASTER MUTED: " + muted);
        if(muted){
            broadcasterVideo.muted = true;
        }
        else{
            broadcasterVideo.muted = false;
        }
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
}tim

function handlePeer(socketId, type, initiator){
    addPeer(socketId, initiator, false, type);
}

function handleNewFeed(newVid, socket_id, type){

    let videosDiv = document.getElementById('videos');
    newVid.className = "vid"
    if (!noVideoInput) {
        if(type !== "broadcaster" && type !== "player"){
            videosDiv.appendChild(newVid)
        }
        else if(type === "broadcaster"){
            // newVid.className = "zeroVid"
            // videosDiv.appendChild(newVid)
            newVid.muted = true;
            broadcasterVideo = newVid;
        }
        else if(type === "player"){
            // newVid.className = "zeroVid"
            // videosDiv.appendChild(newVid)
            newVid.muted = true;
            playerVideos[socket_id] = newVid;
        }
    }
}

function handleUnmuteTeam(players){
    console.log("PLAYERS TO UNMUTE", players);
    for(let p in players){
        playerVideos[players[p].socketId].muted = false;
    }
}

function muteAllPlayers(){
    console.log("MUTING ALL PLAYERS");
    for(let p in playerVideos){
        playerVideos[p].muted = true;
    }
}

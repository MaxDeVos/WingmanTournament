/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: No
 * Video Out: No
 */

// ======================== RTC Bullshit Starts Here ============================

let playerVideos = {};
let casterVideos = {};
let cameraState = "none";

function configUser(socket){
    socket.on('connect', () => {
        console.log("Connected!");
        socket.emit("obs-con", function(data) {
            console.log(data);
        });
    });

    socket.on('obs-invalid', () => {
        document.open();
        document.write('<h1 style="text-align: center;color:red">OBS Already Connected</h1>');
        document.close();
        socket.disconnect();
    });

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        handlePeer(remoteData.socket_id, remoteData.type, false);
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "obs"})
    })

    socket.on('new-observed-player', playerSocket => {
        console.log("Showing Player", playerSocket);
        try{
            document.getElementById("active-player").srcObject = playerVideos[playerSocket].srcObject;
        }catch (e){
            document.getElementById("active-player").srcObject = undefined;
            console.log("Error Handling Player Camera Switch: ", playerSocket);
        }
    })

    socket.on('to-obs', (data) =>{
        console.log("GO DIE");
        console.log(data);
        if(data.type === "active-player-cam"){
            console.log("Switching to Active Player Cam");
            disableCurrentCam();
            enableActivePlayerCamera();
        }
        else if(data.type === "all-players-cam"){
            console.log("Switching to All Players Cam");
            disableCurrentCam();
        }
        else if(data.type === "caster-cam"){
            console.log("Switching to Caster Cam");
            disableCurrentCam();
        }
    })
}

function handlePeer(socketId, type, initiator){
    if(type === "caster"){
        addPeer(socketId, initiator, false, type);
    }
    else{
        addPeer(socketId, initiator, true, type);
    }
}

function handleNewFeed(newVid, socket_id, type){
    console.log("Handing OBS Feed", type);
    newVid.className = "vid"
    if(type === "player"){
        console.log("Appending new player to playerVideos")
        playerVideos[socket_id] = (newVid);
    }
    else if(type === "caster"){
        console.log("Appending new player to playerVideos")
        casterVideos[socket_id] = (newVid);
    }
}

function enableActivePlayerCamera(){
    let activePlayer = document.createElement("video");
    activePlayer.className = "active-player";
    activePlayer.playsinline = false
    activePlayer.autoplay = true
    activePlayer.id = "active-player";
    document.body.appendChild(activePlayer);
    cameraState = "active-player";
}
function disableActivePlayerCamera() {
    let activePlayer = document.getElementById("active-player");
    activePlayer.remove();
}
function disableCurrentCam(){
    switch(cameraState){
        case "active-player":
            disableActivePlayerCamera();
            break;
        case "none":
            break;
        case "default":
            console.log("Unknown cameraState: ", cameraState);
    }
    cameraState = "none";
}

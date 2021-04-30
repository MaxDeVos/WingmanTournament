/**
 * Status: Stable
 * Audio In: Casters
 * Video In: None
 * Audio Out: No
 * Video Out: No
 */

let playerVideoFeeds = [];
let observerSlots = [];
let playerVidDisplays = [];

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
        handlePeer(remoteData.socket_id, remoteData.type, false);

        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "observer"})
    })

    socket.on("observer-slots", (slots) =>{
        observerSlots = slots;
        updateCameras()
    })

    socket.on('new-observed-player', (slot) =>{
        console.log("UPDATED SLOT: ", slot)
        for(let p = 1; p <= 4; p++){
            console.log("UPDATING SLOT ", p)
            if(p === slot){
                console.log("OBSERVED FOUND ON SLOT", p)
                document.getElementById("slot" + p).style.outline = "2px solid red";
            }
            else{
                document.getElementById("slot" + p).style.outline = "2px solid black";
            }
        }

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

function updateCameras(){
    console.log("OBSERVER SLOTS: ", observerSlots)
    attemptSetPlayerCam(1, observerSlots);
    attemptSetPlayerCam(2, observerSlots);
    attemptSetPlayerCam(3, observerSlots);
    attemptSetPlayerCam(4, observerSlots);
}

function attemptSetPlayerCam(number, slots){
    if(playerVideoFeeds[slots[number]] !== undefined){
        playerVidDisplays[number].srcObject = playerVideoFeeds[slots[number]].srcObject;
    }
    else{
        playerVidDisplays[number].srcObject = undefined;
    }
}

function createVideoObject(className, muted){
    let videoObject = document.createElement("video");
    videoObject.className = className;
    videoObject.playsinline = false
    videoObject.autoplay = true
    videoObject.muted = muted;
    return videoObject;
}

for(let p = 1; p <= 4;p++){
    playerVidDisplays[p] = createVideoObject("player-vid", true)
    playerVidDisplays[p].id = p;
    let id = `slot` + p;
    document.getElementById(id).appendChild(playerVidDisplays[p])
}

function handlePeer(socketId, type, initiator){
    addPeer(socketId, initiator, false, type);
}

function handleNewFeed(newVid, socket_id, type){

    let videosDiv = document.getElementById('videos');
    newVid.className = "vid"
    if (!noVideoInput) {
        if(type === "caster"){
            videosDiv.appendChild(newVid)
        }
    }
    if(type === "player"){
        newVid.muted = true;
        newVid.autoplay = true;
        newVid.playsinline = true;
        playerVideoFeeds[socket_id] = newVid;
        updateCameras()
        console.log("NEW PLAYER CONNECTED: ", playerVideoFeeds)
    }

}

/**
 * Socket.io socket
 */
let socket;
let videos = {};
/**
 * The stream object used to send media
 */
let localStream = null;
/**
 * All peer connections
 */
let peers = {}

//////////// CONFIGURATION //////////////////

/**
 * RTCPeerConnection configuration
 */
const configuration = {
    "iceServers": [{
        "urls": "stun:stun.l.google.com:19302"
    },
        // public turn server from https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
        // set your own servers here
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ]
}

/**
 * UserMedia constraints
 */


/////////////////////////////////////////////////////////

if(!noInput) {
// enabling the camera at startup
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        console.log('Received local stream');

        localVideo.srcObject = stream;
        localStream = stream;
        init();

    }).catch(e => alert(`getusermedia error ${e.name}`))
    /**
     * initialize the socket connections
     */
}
else{
    init();
}

/** Update the UI to tell the user they have connected */
function tellUserConnected(){
    let status = document.getElementById("status");
    status.innerHTML = "Connected!"
    status.style = "color:green";
}


function init() {

    socket = io();

    tellUserConnected();

    socket.on('initSend', incoming => {
        console.log('INIT SEND FROM TYPE' + incoming.type);
        try{
            if(incoming.type === "player"){
                activePlayers[incoming.socket_id] = "empty";
            }
        }catch(e){

        }
        /* TODO I'm 99.9% this is undefined
         Despite the fact that this is receiving an empty socket, it seems to work.
         This is the most comically delicate piece of code I've ever come across and I
         am terrified to touch it at all. I have it written as 15 question marks in the
         documentation, and I intend to keep it that way.
         */
        console.log("incoming.socket = ", incoming.socket);
        addPeer(incoming.socket, true)
    })

    socket.on('removePeer', socket_id => {
        console.log('removing peer ' + socket_id)
        removePeer(socket_id)
    })

    socket.on('disconnect', () => {
        console.log('GOT DISCONNECTED')
        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    })

    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal)
    })

    configUser(socket);

}

/**
 * Remove a peer with given socket_id.
 * Removes the video element and deletes the connection
 * @param {String} socket_id
 */
function removePeer(socket_id) {

    let videoEl = document.getElementById(socket_id)
    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null
        videoEl.parentNode.removeChild(videoEl)
    }
    if (peers[socket_id]) peers[socket_id].destroy()
    delete peers[socket_id]
}

function mutePeer(socket_id) {
    let videoEl = videos[socket_id];
    console.log(videoEl)
    if (videoEl) {

        videoEl.muted = true;
        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.muted = true;
        })
    }
}

function unmutePeer(socket_id) {
    let videoEl = videos[socket_id];
    console.log(videoEl)
    if (videoEl) {

        videoEl.muted = false;
        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.muted = false;
        })
    }
}

/**
 * Creates a new peer connection and sets the event listeners
 * @param {String} socket_id
 *                 ID of the peer
 * @param {Boolean} am_initiator
 *                  Set to true if the peer initiates the connection process.
 *                  Set to false if the peer receives the connection.
 */

function addPeer(socket_id, am_initiator) {
    peers[socket_id] = new SimplePeer({
        initiator: am_initiator,
        stream: localStream,
        config: configuration, offerOptions: offerOptions
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })

    let videosDiv = document.getElementById('videos');
    peers[socket_id].on('stream', stream => {
        let newVid = document.createElement('video')
        newVid.srcObject = stream
        newVid.id = socket_id
        newVid.playsinline = false
        newVid.autoplay = true
        newVid.className = "vid"
        if(isPlayer){
            newVid.muted = true
        }
        videos[socket_id] = newVid
        if(!noVideoInput){
            videosDiv.appendChild(newVid)
        }
    })
}

/**
 * Enable/disable microphone
 */
function toggleMute() {
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled
        muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
    }
}
/**
 * Enable/disable video
 */
function toggleVid() {
    for (let index in localStream.getVideoTracks()) {
        localStream.getVideoTracks()[index].enabled = !localStream.getVideoTracks()[index].enabled
        vidButton.innerText = localStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
    }
}

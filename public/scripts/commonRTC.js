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

let cameraStatus = false;

var recorder;

//////////// CONFIGURATION //////////////////

/**
 * RTCPeerConnection configuration
 */
const configuration = {
    "iceServers": [        {
        url: 'stun:wingmantournament.tk:3478?transport=tcp',
        credential: 'fuck',
        username: 'max'
    },
        // public turn server from https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
        // set your own servers here
        {
            url: 'turn:wingmantournament.tk:3478?transport=tcp',
            credential: 'fuck',
            username: 'max'
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
        cameraStatus = true;
        if(localType === "player"){
            recorder = RecordRTC(stream,  {
                bitsPerSecond: 300000,
                bufferSize: 16384,
                numberOfAudioChannels: 1,
                type: 'video'
            })
            console.log("Defined Recorder!")
        }

        init();

        if(localType !== "player" && localType !== "caster"){
            document.getElementById("localVideo").remove();
        }

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

    if(localType !== "broadcaster"){
        tellUserConnected();
    }

    socket.on('initSend', incoming => {
        console.log('INIT SEND FROM TYPE' + incoming.type);
        console.log("incoming.socket = ", incoming.socket);
        handlePeer(incoming.socket, incoming.type, true);
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

    let videoEl = videos[socket_id];
    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null

        delete videos[socket_id];
    }
    if (peers[socket_id]) peers[socket_id].destroy()

    if(localType === "broadcaster"){
        console.log("REMOVING AS BROADCASTER");
        document.getElementById(socket_id).parentElement.remove();
    }

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
 * @param muted
 * @param type
 */

function addPeer(socket_id, am_initiator, muted, type) {

    console.log("Adding Peer ", socket_id);

    peers[socket_id] = new SimplePeer({initiator: am_initiator,
        stream: localStream,
        reconnectTimer: 10,
        iceTransportPolicy: 'relay',
        trickle: true,
        config: {
            "iceServers": [        {
                url: 'stun:wingmantournament.tk:3478?transport=tcp',
                credential: 'fuck',
                username: 'max'
            },
                {
                    url: 'turn:wingmantournament.tk:3478?transport=tcp',
                    credential: 'fuck',
                    username: 'max'
                }
            ]
        }
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })


    peers[socket_id].on('stream', stream => {
        let newVid = document.createElement('video')
        newVid.srcObject = stream
        newVid.id = socket_id
        newVid.playsinline = false
        newVid.autoplay = true
        if(muted){
            newVid.muted = true;
        }
        videos[socket_id] = newVid;

        handleNewFeed(newVid, socket_id, type);

    })
}

// Recording Shenanigans

function startRecording(){
    recorder.startRecording();
}

function stopRecording(){

    recorder.stopRecording(function(){
        var blob = this.getBlob();
        console.log(bytesToSize(blob.size));
        var file = new File([blob], getFileName('webm'), {
            type: 'video/webm'
        });
        invokeSaveAsDialog(file);
    });
}

function getFileName(fileExtension) {
    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    var date = d.getDate();
    return 'RecordRTC-' + year + month + date + '-' + Math.random() + '.' + fileExtension;
}

function postFiles() {
    let blob = recorder.getBlob();

    // getting unique identifier for the file name
    let fileName = (Math.random() * new Date().getTime()).toString(36).replace( /\./g , '') + '.webm';

    let file = new File(blob, fileName, {
        type: 'video/webm'
    });
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

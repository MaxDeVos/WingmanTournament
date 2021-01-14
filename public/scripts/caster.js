import {RTCConnection} from "./RTCConnection";

let currentCall = {isActive: false, peer: undefined};

function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(
    ".active-user.active-user--selected"
  );

  alreadySelectedUser.forEach(el => {
    el.setAttribute("class", "active-user");
  });
}

function createUserItemContainer(socketId) {
  const userContainerEl = document.createElement("div");

  const usernameEl = document.createElement("p");

  userContainerEl.setAttribute("class", "active-user");
  userContainerEl.setAttribute("id", socketId);
  usernameEl.setAttribute("class", "username");
  usernameEl.innerHTML = `Socket: ${socketId}`;

  userContainerEl.appendChild(usernameEl);

  userContainerEl.addEventListener("click", () => {
    unselectUsersFromList();
    userContainerEl.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
    callUser(socketId);
  });

  return userContainerEl;
}

function updateUserList(socketIds) {
  const activeUserContainer = document.getElementById("active-user-container");

  socketIds.forEach(socketId => {
    const alreadyExistingUser = document.getElementById(socketId);
    if (!alreadyExistingUser) {
      const userContainerEl = createUserItemContainer(socketId);

      activeUserContainer.appendChild(userContainerEl);
    }
  });
}

const socket = io.connect("localhost:5000");
var connection = new RTCConnection(socket);

socket.on("update-user-list", ({ users }) => {
  console.log("on update-user-list");
  console.log(users);
  if(users.length > 0){
    connection.setPeerSocket(users[0]);
  }
});

socket.on("remove-user", ({ socketId }) => {
  const elToRemove = document.getElementById(socketId);
  console.log("on remove-user");

  console.log('cp: ', currentCall.peer);
  console.log('dp: ', socketId);
  if(currentCall.peer === socketId){
    currentCall.isActive = false;
  }

  if (elToRemove) {
    elToRemove.remove();
  }
});

socket.on("call-made", async data => {
  await connection.handleReceiveCall(data);
});

socket.on("answer-made", async data => {
  await connection.handleReceiveAnswer(data);
});

connection.peerConnection.ontrack = function({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

const constraints = {audio: true, video: true};

async function run(){
  const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  const localVideo = document.getElementById('local-video');
  if ('srcObject' in localVideo) {
    localVideo.srcObject = mediaStream;
  } else {
    // Avoid using this in new browsers, as it is going away.
    localVideo.src = URL.createObjectURL(mediaStream);
  }

  mediaStream.getTracks().forEach(track => connection.peerConnection.addTrack(track, mediaStream));
}
run();


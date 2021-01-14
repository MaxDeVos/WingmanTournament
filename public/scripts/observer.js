let currentCall = {isActive: false, peer: undefined};

const { RTCPeerConnection, RTCSessionDescription } = window;



document.getElementById("broadcasterAudioStatus").style.color = 'red';

function createUserItemContainer(socketId) {
  const userContainerEl = document.createElement("div");

  const usernameEl = document.createElement("p");

  userContainerEl.setAttribute("class", "active-user");
  userContainerEl.setAttribute("id", socketId);
  usernameEl.setAttribute("class", "username");
  usernameEl.innerHTML = `Socket: ${socketId}`;

  userContainerEl.appendChild(usernameEl);

  userContainerEl.addEventListener("click", () => {
    userContainerEl.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
    callUser(socketId);
  });

  return userContainerEl;
}

function updateUserList(socketIds) {

  socketIds.forEach(socketId => {
    const alreadyExistingUser = document.getElementById(socketId);
    if (!alreadyExistingUser) {
      const userContainerEl = createUserItemContainer(socketId);

      activeUserContainer.appendChild(userContainerEl);
    }
  });
}

async function callUser(socketId) {
  const offer = await peerConnection.createOffer({offerToReceiveAudio:true, });
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", {
    offer,
    to: socketId
  });
}

const socket = io.connect("localhost:5000");

socket.on("update-user-list", ({ users }) => {
  console.log("on update-user-list");
  console.log(users);
  updateUserList(users);
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
  console.log("on call-made");
  await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  console.log("emit make-answer");
  socket.emit("make-answer", {
    answer,
    to: data.socket
  });

});

socket.on("answer-made", async data => {
  console.log("on answer-made");
  await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
  );

  if (!currentCall.isActive) {
    currentCall.isActive = true;
    console.trace('answering socket', data.socket);
    currentCall.peer = data.socket;
    await callUser(data.socket);
  }
});

peerConnection.ontrack = function({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

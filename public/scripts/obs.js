/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: No
 * Video Out: No
 */

// ======================== RTC Bullshit Starts Here ============================

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
        try{
            for(let i in peers){
                document.getElementById(i).style.position = "absolute";
                if(i === playerSocket){
                    document.getElementById(i).style.visibility = "visible";
                }
                else{
                    document.getElementById(i).style.visibility = "hidden";
                }
            }
        }catch (e){
            console.log("Error Handling Player Camera Switch: ", playerSocket);
            console.log(e);
        }
    })

    socket.on('active-player-cam', ()=>{
        console.log("Switching to Active Player Cam");
    })
    socket.on('all-players-cam', ()=>{
        console.log("Switching to All Players Cam");
    })
    socket.on('caster-cam', ()=>{
        console.log("Switching to Caster Cam");
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

}

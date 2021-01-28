/**
 * Status: Needs CSGO Integration
 * Audio In: Caster
 * Video In: Player
 * Audio Out: Yes -> Caster
 * Video Out: No
 */

let lastObservedPlayer = "";
let localSocket;

//====================== User Listeners ============================

function createUserListener(name, socket){
    socket.on(`${name}-con`, () => {
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    socket.on(`${name}-dc`, () => {
        document.getElementById(`${name}-status`).style = "color:red";
        document.getElementById(`${name}-status`).innerHTML = "Disconnected";
    });
}

// ======================== RTC Bullshit Starts Here ============================

function sendStartRecording(){
    localSocket.emit("start-recording");
}

function sendStopRecording(){
    localSocket.emit("stop-recording");
}

function startMapSelection(){
    localSocket.emit("start-map-selection");
}

function configUser(socket){

    localSocket = socket;

    socket.on('connect', () => {
        console.log("Connected!");
        socket.emit("broadcaster-con", function(data) {
            console.log(data);
        });
    });

    socket.on('broadcaster-invalid', () => {
        document.open();
        document.write('<h1 style="text-align: center;color:red">Caster Already Connected</h1>');
        document.close();
        socket.disconnect();
    });

    socket.on('initReceive', remoteData => {
        console.log('INIT RECEIVE FROM ' + remoteData.socket_id + ":" + remoteData.type);
        if(remoteData.type === "player"){
            addPeer(remoteData.socket_id, false, true);
        }
        else{
            addPeer(remoteData.socket_id, false, false);
        }
        socket.emit('initSend', {socket_id: remoteData.socket_id, type: "broadcaster"})
    })

    socket.on('new-observed-player', playerSocket => {
        console.log("New Observed Player!")
        try{
            for(let i in peers){
                document.getElementById(i).style.position = "relative";
                if(i === playerSocket){
                    document.getElementById(i).style.border = "solid red 5px";
                }
                else{
                    document.getElementById(i).style.border = "solid black 1px";
                }
            }
        }catch (e){
            console.log("Error Handling Player Camera Switch: ", playerSocket);
            console.log(e);
        }
    })

    socket.on('start-map-selection', (maps) => {
        specStartMapSelection(maps)
    });

    createUserListener('observer', socket);
    createUserListener('broadcaster', socket);
    createUserListener('caster1', socket);
    createUserListener('caster2', socket);
    createUserListener('player1', socket);
    createUserListener('player2', socket);
    createUserListener('player3', socket);
    createUserListener('player4', socket);
}

const socket = io();

socket.on('connect', () => {
    console.log("Connected!");
    socket.emit("player-con", function(data) {
        console.log(data);
    });
});

socket.on('player-invalid', () => {
    document.open();
    document.write('<h1 style="text-align: center;color:red">4 Players Already Connected</h1>');
    document.close();
    socket.disconnect();
});

function createUserListener(name){
    socket.on(`${name}-con`, () => {
        document.getElementById(`${name}-status`).style = "color:green";
        document.getElementById(`${name}-status`).innerHTML = "Connected";
    });

    socket.on(`${name}-dc`, () => {
        document.getElementById(`${name}-status`).style = "color:red";
        document.getElementById(`${name}-status`).innerHTML = "Disconnected";
    });
}

createUserListener('observer');
createUserListener('broadcaster');
createUserListener('caster1');
createUserListener('caster2');
// createUserListener('player1');
// createUserListener('player2');
// createUserListener('player3');
// createUserListener('player4');

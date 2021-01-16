const socket = io();

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

createUserListener('caster-1');
createUserListener('caster-2');


peers = {}


module.exports = (io) => {

    /* TODO
    Put this shit in index.js and pass the type of connection (player/observer/etc.) with the socket
    and then filter it accordingly so that the correct people get the correct data.  May be inefficient since
    it requires more peers, but if we halt video sockets(I don't even know what I mean by that and I wrote it)
    it might be better.

    I don't know.  Go the fuck to sleep.
     */
    io.on('connect', (socket) => {
        console.log('a client is connected')


        // Initiate the connection process as soon as the client connects

        peers[socket.id] = socket

        // Asking all other clients to setup the peer connection receiver
        for(let id in peers) {
            if(id === socket.id) continue
            console.log('sending init receive to ' + socket.id)
            peers[id].emit('initReceive', socket.id)
        }

        /**
         * relay a peerconnection signal to a specific socket
         */
        socket.on('signal', data => {
            console.log('sending signal from ' + socket.id + ' to ', data)
            if(!peers[data.socket_id])return
            peers[data.socket_id].emit('signal', {
                socket_id: socket.id,
                signal: data.signal
            })
        })

        /**
         * remove the disconnected peer connection from all other connected clients
         */
        socket.on('disconnect', () => {
            console.log('socket disconnected ' + socket.id)
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[socket.id]
        })

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */
        socket.on('initSend', init_socket_id => {
            console.log('INIT SEND by ' + socket.id + ' for ' + init_socket_id)
            peers[init_socket_id].emit('initSend', socket.id)
        })
    })
    console.log("Loaded Socket Controller!")
}

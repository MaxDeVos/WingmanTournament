export default class RTCConnection {

    private socket = undefined;
    private avParams = undefined;
    private peerSocket = undefined;

    public peerConnection =
        new RTCPeerConnection({'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]});

    constructor(socket, peerSocket, avParams) {
        this.socket = socket;
        this.avParams = avParams;
        this.peerSocket = peerSocket;
    }

    public setPeerSocket(socket) : void {
        this.peerSocket = socket;
    }

    private async createOffer(){
        let offer;
        if(this.avParams == undefined){
            offer = await this.peerConnection.createOffer();
        }
        else{
            offer = await this.peerConnection.createOffer(this.avParams);
        }
        return offer;
    }

    public async call(){
        // Create offer
        let offer = await this.createOffer();

        // Set local description based on offer
        await this.peerConnection.setLocalDescription(new RTCSessionDescription(offer));

        // Send offer to peer
        this.socket.emit("call-user", {
            offer,
            to: this.peerSocket
        });
    }

    public async handleReceiveCall(data){
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(new RTCSessionDescription(answer));

        console.log("received call");
        this.socket.emit("make-answer", {
            answer,
            to: data.socket
        });
    }

    public async handleReceiveAnswer(data){
        console.log("on answer-made");
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );

        console.trace('answering socket', data.socket);
        await this.call();
    }
}

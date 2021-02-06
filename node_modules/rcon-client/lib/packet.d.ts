/// <reference types="node" />
export interface Packet {
    id: number;
    type: number;
    payload: Buffer;
}
export declare function encodePacket(packet: Packet): Buffer;
export declare function decodePacket(buffer: Buffer): Packet;
export declare enum PacketType {
    Auth = 3,
    AuthResponse = 2,
    Command = 2,
    CommandResponse = 0
}

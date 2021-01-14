"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
class Server {
    constructor() {
        this.activeSockets = [];
        this.DEFAULT_PORT = 5000;
        this.broadcasterSocket = undefined;
        this.casterSocket = undefined;
        this.observerSocket = undefined;
        this.initialize();
    }
    initialize() {
        this.app = express_1.default();
        this.httpServer = http_1.createServer(this.app);
        this.io = socket_io_1.default(this.httpServer);
        this.configureApp();
        this.configureRoutes();
        this.handlePlayerConnection();
    }
    configureApp() {
        this.app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
    }
    configureRoutes() {
        this.app.get("/", (req, res) => {
            res.sendFile(path_1.default.resolve("public/player.html"));
            this.handlePlayerConnection();
        });
        this.app.get("/observer", (req, res) => {
            if (this.observerSocket == undefined) {
                res.sendFile(path_1.default.resolve("public/observer.html"));
                this.handleObserver();
            }
            else {
                res.send("<h1 style='text-align: center'>Observer already connected!</h1>");
            }
        });
        this.app.get("/caster", (req, res) => {
            if (this.casterSocket == undefined) {
                res.sendFile(path_1.default.resolve("public/caster.html"));
                this.handleCaster();
            }
            else {
                res.send("<h1 style='text-align: center'>Caster already connected!</h1>");
            }
        });
        this.app.get("/broadcaster", (req, res) => {
            if (this.broadcasterSocket == undefined) {
                res.sendFile(path_1.default.resolve("public/broadcaster.html"));
                this.handleBroadcaster();
            }
            else {
                res.send("<h1 style='text-align: center'>Broadcaster already connected!</h1>");
            }
        });
    }
    handlePlayerConnection() {
        this.io.on("connection", socket => {
            const existingSocket = this.activeSockets.find(existingSocket => existingSocket === socket.id);
            if (!existingSocket) {
                this.activeSockets.push(socket.id);
                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(existingSocket => existingSocket !== socket.id)
                });
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
            }
            socket.on("call-user", (data) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });
            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            socket.on("disconnect", () => {
                console.log("user disconnected");
                this.activeSockets = this.activeSockets.filter(existingSocket => existingSocket !== socket.id);
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
            });
        });
    }
    handleObserver() {
        this.io.on("connection", socket => {
            this.observerSocket = socket;
            socket.broadcast.emit("update-user-list", {
                users: [socket.id]
            });
            socket.on("call-user", (data) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });
            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            socket.on("disconnect", () => {
                if (this.casterSocket != undefined) {
                    socket.to(this.casterSocket).emit("obs-dc");
                }
                console.log("observer disconnected");
                this.observerSocket = undefined;
            });
        });
    }
    handleCaster() {
    }
    handleBroadcaster() {
        this.io.on("connection", socket => {
            const existingSocket = this.activeSockets.find(existingSocket => existingSocket === socket.id);
            if (!existingSocket) {
                this.activeSockets.push(socket.id);
                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(existingSocket => existingSocket !== socket.id)
                });
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
            }
            socket.on("call-user", (data) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });
            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            socket.on("disconnect", () => {
                console.log("user disconnected");
                this.activeSockets = this.activeSockets.filter(existingSocket => existingSocket !== socket.id);
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
            });
        });
    }
    listen(callback) {
        this.httpServer.listen(this.DEFAULT_PORT, () => {
            callback(this.DEFAULT_PORT);
        });
    }
}
exports.Server = Server;

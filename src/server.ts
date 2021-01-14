import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io: SocketIOServer;

  private activeSockets: string[] = [];

  private readonly DEFAULT_PORT = 5000;

  private broadcasterSocket = undefined;
  private casterSocket = undefined;
  private observerSocket = undefined;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.configureRoutes();
    this.handlePlayerConnection();
  }

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  private configureRoutes(): void {
    this.app.get("/", (req, res) => {
      res.sendFile(path.resolve("public/player.html"));
      this.handlePlayerConnection();
    });

    this.app.get("/observer", (req, res) => {
      if(this.observerSocket == undefined){
        res.sendFile(path.resolve("public/observer.html"));
        this.handleObserver();
      }
      else{
        res.send("<h1 style='text-align: center'>Observer already connected!</h1>");
      }
    });

    this.app.get("/caster", (req, res) => {
      if(this.casterSocket == undefined){
        res.sendFile(path.resolve("public/caster.html"));
        this.handleCaster();
      }
      else{
        res.send("<h1 style='text-align: center'>Caster already connected!</h1>");
      }
    });

    this.app.get("/broadcaster", (req, res) => {
      if(this.broadcasterSocket == undefined){
        res.sendFile(path.resolve("public/broadcaster.html"));
        this.handleBroadcaster();
      }
      else{
        res.send("<h1 style='text-align: center'>Broadcaster already connected!</h1>");
      }
    });
  }

  private handlePlayerConnection(): void {
    this.io.on("connection", socket => {
      const existingSocket = this.activeSockets.find(
        existingSocket => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
          )
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id]
        });
      }

      socket.on("call-user", (data: any) => {
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
        this.activeSockets = this.activeSockets.filter(
          existingSocket => existingSocket !== socket.id
        );
        socket.broadcast.emit("remove-user", {
          socketId: socket.id
        });
      });
    });
  }

  private handleObserver(): void {

    this.io.on("connection", socket => {

      this.observerSocket = socket;

      socket.broadcast.emit("update-user-list", {
        users: [socket.id]
      });

      socket.on("call-user", (data: any) => {
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
        if(this.casterSocket != undefined){
          socket.to(this.casterSocket).emit("obs-dc");
        }
        console.log("observer disconnected");
        this.observerSocket = undefined;
      });
    });
  }

  private handleCaster(): void {

  }

  private handleBroadcaster(): void {
    this.io.on("connection", socket => {
      const existingSocket = this.activeSockets.find(
          existingSocket => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
              existingSocket => existingSocket !== socket.id
          )
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id]
        });
      }

      socket.on("call-user", (data: any) => {
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
        this.activeSockets = this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
        );
        socket.broadcast.emit("remove-user", {
          socketId: socket.id
        });
      });
    });
  }


  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }
}

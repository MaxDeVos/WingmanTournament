"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const server = new server_1.Server();
server.listen(port => {
    console.log(`Server is listening on http://localhost:${port}/caster`);
});

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("接続:", socket.id);

    socket.on("joinRoom", (room) => {
        socket.join(room);
        socket.roomId = room;
        console.log(`${socket.id} joined ${room}`);
    });

    socket.on("gameState", (data) => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit("enemyState", data);
        }
    });

    socket.on("disconnect", () => {
        console.log("切断:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server started: http://localhost:" + PORT);
});

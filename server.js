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
        const roomId = typeof room === "string" && room.trim()
            ? room.trim()
            : "default";

        if (socket.roomId) {
            socket.leave(socket.roomId);
        }

        socket.join(roomId);
        socket.roomId = roomId;
        console.log(`${socket.id} joined ${roomId}`);
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

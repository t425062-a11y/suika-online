const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let rooms = {}; 

function getRoomList() {
    let list = [];
    for (let rId in rooms) {
        list.push({ id: rId, count: rooms[rId].length });
    }
    return list;
}

io.on("connection", (socket) => {
    let room = null;

    socket.emit("roomList", getRoomList());

    socket.on("joinRoom", (roomName) => {
        room = roomName;
        socket.join(room);
        if (!rooms[room]) rooms[room] = [];
        if (rooms[room].length < 2) {
            rooms[room].push(socket.id);
        }
        io.emit("roomList", getRoomList());
    });

    socket.on("gameState", (state) => {
        if (room) {
            socket.broadcast.to(room).emit("enemyState", state);
        }
    });

    // 【重要】スキルを自分以外の相手（broadcast）だけに確実に届ける処理
    socket.on("triggerSkill", (data) => {
        if (room) {
            socket.broadcast.to(room).emit("receiveSkill", data);
        }
    });

    socket.on("leaveRoom", () => {
        if (room && rooms[room]) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);
            if (rooms[room].length === 0) delete rooms[room];
            socket.leave(room);
        }
        io.emit("roomList", getRoomList());
        room = null;
    });

    socket.on("disconnect", () => {
        if (room && rooms[room]) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);
            if (rooms[room].length === 0) delete rooms[room];
        }
        io.emit("roomList", getRoomList());
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

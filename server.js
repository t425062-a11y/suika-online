const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// roomId -> Set<socket.id>  （現在アクティブなROOMと参加人数を管理する）
const rooms = new Map();

function getRoomList() {
    const list = [];

    for (const [roomId, members] of rooms.entries()) {
        if (members.size > 0) {
            list.push({ id: roomId, count: members.size });
        }
    }

    list.sort((a, b) => a.id.localeCompare(b.id));

    return list;
}

function broadcastRoomList() {
    io.emit("roomList", getRoomList());
}

function leaveCurrentRoom(socket) {
    if (!socket.roomId) {
        return;
    }

    socket.leave(socket.roomId);

    const members = rooms.get(socket.roomId);

    if (members) {
        members.delete(socket.id);

        if (members.size === 0) {
            rooms.delete(socket.roomId);
        }
    }

    socket.roomId = null;
}

io.on("connection", (socket) => {
    console.log("接続:", socket.id);

    // 接続直後に現在のROOM一覧を送る
    socket.emit("roomList", getRoomList());

    socket.on("joinRoom", (room) => {
        const roomId = typeof room === "string" && room.trim()
            ? room.trim()
            : "default";

        leaveCurrentRoom(socket);

        socket.join(roomId);
        socket.roomId = roomId;

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }

        rooms.get(roomId).add(socket.id);

        console.log(`${socket.id} joined ${roomId}`);

        broadcastRoomList();
    });

    socket.on("gameState", (data) => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit("enemyState", data);
        }
    });

    socket.on("disconnect", () => {
        console.log("切断:", socket.id);

        leaveCurrentRoom(socket);
        broadcastRoomList();
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server started: http://localhost:" + PORT);
});

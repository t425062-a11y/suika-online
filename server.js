const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

io.on("connection", (socket) => {
    let currentRoom = null;

    function broadcastRoomList() {
        const list = Object.keys(rooms).map(roomId => ({
            id: roomId,
            count: rooms[roomId].length
        }));
        io.emit("roomList", list);
    }

    broadcastRoomList();

    socket.on("joinRoom", (roomId) => {
        if (!roomId) roomId = "default";
        
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
            if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
            socket.leave(currentRoom);
        }

        currentRoom = roomId;
        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = [];
        if (rooms[roomId].length < 2) {
            rooms[roomId].push(socket.id);
        }

        // 自分のSocket IDをクライアントに教えてあげる
        socket.emit("yourSocketId", socket.id);
        broadcastRoomList();
    });

    socket.on("gameState", (state) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit("enemyState", state);
    });

    // 【通信強化】部屋の全員に送信し、送信元のIDを添付する
    socket.on("triggerSkill", (skillData) => {
        if (!currentRoom) return;
        skillData.senderId = socket.id; // 誰が撃ったスキルか記録
        io.to(currentRoom).emit("receiveSkill", skillData);
    });

    socket.on("leaveRoom", () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
            if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
            socket.leave(currentRoom);
            currentRoom = null;
        }
        broadcastRoomList();
    });

    socket.on("disconnect", () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
            if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
        }
        broadcastRoomList();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

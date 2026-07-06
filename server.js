const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// 部屋ごとの接続状態を管理
const rooms = {};

io.on("connection", (socket) => {
    let currentRoom = null;

    // 定期的にロビーへ部屋リストを配る
    function broadcastRoomList() {
        const list = Object.keys(rooms).map(roomId => ({
            id: roomId,
            count: rooms[roomId].length
        }));
        io.emit("roomList", list);
    }

    // 最初の一歩として部屋リストを送る
    broadcastRoomList();

    // 部屋に入る
    socket.on("joinRoom", (roomId) => {
        if (!roomId) roomId = "default";
        
        // 以前の部屋があれば抜ける
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
            if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
            socket.leave(currentRoom);
        }

        currentRoom = roomId;
        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = [];
        // 1つの部屋は最大2人まで
        if (rooms[roomId].length < 2) {
            rooms[roomId].push(socket.id);
        }

        broadcastRoomList();
    });

    // ゲーム状態の同期（位置やスコア）
    socket.on("gameState", (state) => {
        if (!currentRoom) return;
        // 自分以外の部屋のメンバーに状態を転送
        socket.to(currentRoom).emit("enemyState", state);
    });

    // 【最重要】スキル発動の仲介（ここが動いていなかった！）
    socket.on("triggerSkill", (skillData) => {
        if (!currentRoom) return;
        // スキルを発動した人「以外」の、同じ部屋の対戦相手にそのままスキルを叩き込む
        socket.to(currentRoom).emit("receiveSkill", skillData);
    });

    // 部屋を自発的に抜ける
    socket.on("leaveRoom", () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
            if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
            socket.leave(currentRoom);
            currentRoom = null;
        }
        broadcastRoomList();
    });

    // 切断時
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

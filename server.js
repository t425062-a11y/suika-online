const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// roomId -> Set<socket.id>（現在アクティブなROOMと参加人数を管理する）
const rooms = new Map();

// 👑 各プレイヤーの最新のゲーム状態（スコアやゲームオーバーフラグ）をサーバー側で記憶する
const playerStates = new Map();

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

    // 退室時に記憶していた状態も消去
    playerStates.delete(socket.id);
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
        
        // 新規入室時に状態を初期化
        playerStates.set(socket.id, { score: 0, gameOver: false, balls: [] });

        console.log(`${socket.id} joined ${roomId}`);
        broadcastRoomList();
    });

    // 🎮 ゲーム状態の受信と転送
    socket.on("gameState", (data) => {
        if (socket.roomId) {
            // サーバー側に最新の状態を保存（相手が通信を止めても、この状態が維持される）
            playerStates.set(socket.id, data);

            // 通常通り相手にデータを転送
            socket.to(socket.roomId).emit("enemyState", data);
        }
    });

    socket.on("disconnect", () => {
        console.log("切断:", socket.id);

        // 🚨 もし対戦中に突然切断（ブラウザを閉じるなど）したら、残された側を不戦勝（WIN）にするため
        // 切断したプレイヤーを強制的に「ゲームオーバー」扱いにして最後のデータを相方に送る
        if (socket.roomId) {
            const lastState = playerStates.get(socket.id) || { score: 0 };
            lastState.gameOver = true; // 強制ゲームオーバー
            socket.to(socket.roomId).emit("enemyState", lastState);
        }

        leaveCurrentRoom(socket);
        broadcastRoomList();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server started: http://localhost:" + PORT);
});
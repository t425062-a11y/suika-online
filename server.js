const express = require("express");

const app = express();

const http = require("http").createServer(app);

const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", (socket) => {

    console.log("接続");

    socket.on("joinRoom", (roomId) => {

        socket.join(roomId);

        socket.roomId = roomId;

        console.log("参加:", roomId);

    });

    socket.on("gameState", (data) => {

        if (socket.roomId) {

            socket.to(socket.roomId).emit(
                "enemyState",
                data
            );

        }

    });

    socket.on("disconnect", () => {

        console.log("切断");

    });

});

const PORT = process.env.PORT || 8080;

http.listen(PORT, "0.0.0.0", () => {

    console.log("Server Start");

});

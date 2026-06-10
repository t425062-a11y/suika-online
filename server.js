const express = require("express");

const app = express();

const http = require("http").createServer(app);

const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", (socket) => {

    console.log("接続");

    socket.on("gameState", (data) => {

        socket.broadcast.emit(
            "enemyState",
            data
        );

    });

    socket.on("disconnect", () => {

        console.log("切断");

    });

});

const PORT = process.env.PORT || 8080;

http.listen(PORT, "0.0.0.0", () => {

    console.log("Server Start");

});

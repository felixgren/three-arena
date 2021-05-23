const express = require('express');
const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.static('../dist/'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '../../dist/index.html');
});

let players = {};

(() => {
    setup();

    // Roughly matches 120 refresh
    setInterval(function () {
        // Update players positions
        io.sockets.emit('playerPositions', players);
    }, 8);
})();

function setup() {
    io.on('connection', function (socket) {
        // Client connect...
        console.log(`User ${socket.id} connected`);

        // Add to server players object
        players[socket.id] = {
            position: [0, 0, 0],
            velocity: ['some', 'data'],
        };

        // We give all clients notice of new player and their ID..
        socket.broadcast.emit(
            'player connect',
            socket.id,
            io.engine.clientsCount
        );

        // We give client their ID, playerCount and playerIDs
        socket.emit(
            'initPlayer',
            { id: socket.id },
            io.engine.clientsCount,
            Object.keys(players)
        );

        // We give clients notice of disconnection and the their ID
        socket.on('disconnect', function () {
            console.log(`User ${socket.id} disconnected`);
            socket.broadcast.emit(
                'player disconnect',
                socket.id,
                io.engine.clientsCount
            );
            // Delete from players object
            delete players[socket.id];
        });

        // On chat message emit it to everyone
        socket.on('chat message', function (msg, msg2) {
            io.emit('chat message', msg, msg2);
        });

        // Data every client uploads
        socket.on('updateClientPos', (data) => {
            if (players[socket.id]) {
                players[socket.id].position = data;
            }
        });
    });

    let port = process.env.PORT;
    if (port == null || port == '') {
        port = 3000;
    }

    http.listen(port, function () {
        console.log(`Listening on port ${port}`);
    });
}

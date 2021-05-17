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

io.on('connection', function (socket) {
    console.log('A user connected');
    console.log(`${socket.id} connected`);
    socket.emit('setId', { id: socket.id });

    socket.broadcast.emit('player connect', socket.id);

    socket.on('disconnect', function () {
        console.log('A user disconnected');
        socket.broadcast.emit('player disconnect', socket.id);
    });

    socket.on('chat message', function (msg, msg2) {
        socket.broadcast.emit('chat message', msg, msg2);
    });
});

http.listen(3000, function () {
    console.log('Listening on port 3000');
});

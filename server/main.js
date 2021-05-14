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

    socket.on('disconnect', function () {
        console.log('A user disconnected');
    });

    socket.on('chat message', function (msg) {
        console.log(msg);
        socket.broadcast.emit('chat message', msg);
    });
});

http.listen(3000, function () {
    console.log('Listening on port 3000');
});

'use strict';

const express = require('express');
const app = express();
const server = require('http').createServer(app);

const io = require('socket.io')(server);

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server listening at port ${port}`);
});


// Routing
app.use(express.static(`${__dirname}/public`));

// Number of users connected
let usersConnected = 0;

io.on('connection', (socket) => {
    let userConnected = false;

    socket.on('user:connecting', () => {
        if (userConnected) return;

        ++usersConnected;
        console.log('user connecting', usersConnected);
        userConnected = true;
        socket.emit('user:connected', {
            numUsers: usersConnected
        });

        socket.broadcast.emit('user:joined', {
            numUsers: usersConnected
        });
    });

    socket.on('admin', (command) => {
        console.log('admin command:', command);
        socket.emit('admin:command:emit', {
            name: command.name,
            params: command.params
        });
        socket.broadcast.emit('admin:command:broadcast', {
            name: command.name,
            params: command.params
        });
    });

    socket.on('disconnect', () => {
        if (userConnected) {
            --usersConnected;
            console.log('user disconnected', usersConnected);
            userConnected = false;
            socket.broadcast.emit('user:disconnected', {
                numUsers: usersConnected
            });
        }
    });
});

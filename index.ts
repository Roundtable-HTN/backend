import { Server } from "socket.io";

const io = new Server(3000, { /* options */ });

io.on("connection", (socket) => {
    console.log("a user connected: " + socket.request.connection.remoteAddress);

    socket.on('create_room', (data, callback) => {
        console.log(`create_room ${data.code}`);
        // todo: check if room already exist
        // todo: actually make the room
        callback(true);
    });

    socket.on('join_room', (data, callback) => {
        console.log(`join_room ${data.username} ${data.code}`);
        // todo: check room exists
        // todo: insert user into room
        socket.to(data.code).emit('user_joined', { username: data.username });
        callback(true);
    });

    socket.on('send_message', (data, callback) => {
        console.log(`send_message ${data.username} ${data.code} ${data.msg}`);
        // todo: check user in room
        // todo: check room exists
        socket.to(data.code).emit('message_sent', data);
        callback(true);
    })
});
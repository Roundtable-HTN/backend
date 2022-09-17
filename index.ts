import { Server } from "socket.io";
import { nanoid } from "nanoid";

const io = new Server(3000, { /* options */ });


let rooms: any = {};

io.on("connection", (socket) => {
    console.log("a user connected: " + socket.handshake.address);

    socket.on('create_room', (data, callback) => {
        nanoid()
        console.log(`create_room ${data.code}`);
        // check if room already exist
        if(rooms[data.code]) {
            callback('error');
        }
        // actually make the room
        rooms[data.code] = { 'users': [] }
        callback('ok');
    });

    socket.on('join_room', (data, callback) => {
        console.log(`join_room ${data.username} ${data.code}`);
        // check room exists
        if(!rooms[data.code]) {
            callback('error');
        }
        // check if user already exists
        if(rooms[data.code].users.includes(data.username)) {
            callback('error');
        }
        // insert user into room
        rooms[data.code].users.push(data.username);
        socket.to(data.code).emit('user_joined', { username: data.username });
        callback('ok');
    });

    socket.on('send_message', (data, callback) => {
        console.log(`send_message ${data.username} ${data.code} ${data.msg}`);
        // check room exists
        if(!rooms[data.code]) {
            callback('error');
        }
        // check user in room
        if(!rooms[data.code].includes(data.username)) {
            callback('error');
        }
        socket.to(data.code).emit('message_sent', data);
        callback('ok');
    });

    socket.on('disconnect', () => {
        console.log('disconnect');  
    });
});
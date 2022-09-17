import { Server } from "socket.io";
import { PrismaClient } from '@prisma/client'

import { nanoid } from "nanoid";

const io = new Server(3000, { /* options */ });
const prisma = new PrismaClient();

let id_map: any = {};
let rooms: any = {};

io.on("connection", (socket) => {
    console.log("a user connected: " + socket.handshake.address);

    socket.on('create_room', (data, callback) => {
        console.log(`create_room ${data.code}`);
        // check if room already exist
        if(rooms[data.code]) {
            callback('error');
        }
        // actually make the room
        rooms[data.code] = { 'users': [] }
        id_map[data.code] = {}
        callback('ok');
    });

    socket.on('join_room', (data, callback) => {
        console.log(`join_room ${data.code} ${data.session_id}`);
        // check room exists
        if(!rooms[data.code]) {
            callback('error');
        }
        // check if user already exists
        if(!id_map[data.code].includes(data.session_id)) {
            callback('error');
        }
        callback('ok');
    });

    socket.on('join_new_room', (data, callback) => {
        console.log(`join_new_room ${data.code} ${data.username}`);
        // check room exists
        if(!rooms[data.code]) {
            callback('error');
        }
        let id = nanoid();
        id_map[data.code][id] = data.username;
        callback(id);
        socket.to(data.code).emit('user_joined', { username: data.username, code: data.code });
    });

    socket.on('send_message', (data, callback) => {
        console.log(`send_message ${data.session_id} ${data.code} ${data.msg}`);
        // check room exists
        if(!rooms[data.code]) {
            callback('error');
        }
        // check user in room
        if(!id_map[data.code].includes(data.session_id)) {
            callback('error');
        }
        socket.to(data.code).emit('message_sent', { username: id_map[data.code][data.session_id], code: data.code, msg: data.msg });
        callback('ok');
    });
});
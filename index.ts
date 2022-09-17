import { Server } from "socket.io";
import { nanoid } from "nanoid";

const io = new Server(3000, { /* options */ });

let id_map: any = {}; // Map<Room Code, Map<Session ID, Username>>
let rooms: any = {};

let plugins: any = [];
let instances: any = [];
let lazy: any = [];

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
        socket.join(`room:${data.code}`)
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
        socket.join(`room:${data.code}`)
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
        socket.join(`room:${data.code}`)
        socket.to(`room:${data.code}`).emit('user_joined', { username: data.username, code: data.code });
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
        socket.to(`room:${data.code}`).emit('message_sent', { username: id_map[data.code][data.session_id], code: data.code, msg: data.msg });
        callback('ok');
    });

    socket.on("create_plugin", (data, callback) => {
        console.log(`create_plugin ${data.code} ${data.plugin}`);
        if(!rooms[data.code]) {
            callback('error');
        }
        // todo: implement plugin creation
        // allocate the plugin
        if(lazy.length > 0) {
            instances[lazy[lazy.length - 1]].push([]); // todo implement
            lazy.pop(lazy.length - 1);
        } else {
            instances.push([]); // todo implement
        }
        callback('ok');
    });

    socket.on("join_plugin", (data, callback) => {
        console.log(`join_plugin ${data.username} ${data.code} ${data.slot}`);
        // check user in room
        if(!id_map[data.code].includes(data.session_id)) {
            callback('error');
        }
        // check room exists
        if(!rooms[data.code]) {
            callback('error');
        }
        // check plugin exists
        if(0 > data.slot || data.slot > instances.length || instances[data.slot] === null) {
            callback('error');
        }
        // allocate a room

        const plugin_room = `plugin:${data.slot}`;
        socket.join(plugin_room);
        callback(plugin_room);
  
        socket.broadcast.to(plugin_room).emit("plugin_user_joined", {});
    });
});

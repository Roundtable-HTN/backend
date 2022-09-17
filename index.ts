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

        // actually make the room
        rooms[data.code] = { users: [] }
        id_map[data.code] = {}
        socket.join(`room:${data.code}`)
        callback('ok');
    });

    socket.on('join_room', (data, callback) => {
        console.log(`join_room ${data.code} ${data.session_id}`);

        socket.join(`room:${data.code}`)
        callback('ok');
    });

    socket.on('join_new_room', (data, callback) => {
        console.log(`join_new_room ${data.code} ${data.username}`);

        let id = nanoid();
        id_map[data.code][id] = data.username;
        callback(id);
        socket.join(`room:${data.code}`)
        socket.to(`room:${data.code}`).emit('user_joined', { username: data.username, code: data.code });
    });

    socket.on('send_message', (data, callback) => {
        console.log(`send_message ${data.session_id} ${data.code} ${data.msg}`);

        socket.to(`room:${data.code}`).emit('message_sent', { username: id_map[data.code][data.session_id], code: data.code, msg: data.msg });
        callback('ok');
    });

    socket.on("create_plugin", (data, callback) => {
        console.log(`create_plugin ${data.code} ${data.plugin}`);
        // allocate the plugin
        if(lazy.length > 0) {
            instances[lazy[lazy.length - 1]] = { x: 800, y: 500, data: '', host: null }; // todo implement
            callback(lazy[lazy.length - 1]);
            lazy.pop(lazy.length - 1);
        } else {
            instances.push({ x: 800, y: 500, data: '', host: null }); // todo implement
            callback(instances.length - 1);
        }
        callback('ok');
    });

    socket.on("join_plugin", (data, callback) => {
        console.log(`join_plugin ${data.session_id} ${data.code} ${data.slot}`);

        if(!instances[data.slot].host) {
            instances[data.slot].host = data.session_id;
            socket.to(`room:${data.code}`).emit('set_host', { host: data.session_id });
        }

        // join a room
        const plugin_room = `plugin:${data.slot}`;
        socket.join(plugin_room);
        callback(plugin_room);
  
        socket.broadcast.to(plugin_room).emit("plugin_user_joined", {});
    });

    socket.on("leave_plugin", (data, callback) => {
        console.log(`leave_plugin ${data.session_id} ${data.code} ${data.slot}`);

        const plugin_room = `plugin:${data.slot}`;
        socket.leave(plugin_room);
        socket.broadcast.to(plugin_room).emit("plugin_user_left", {});
    });

    socket.on("delete_plugin", (data, callback) => {
        console.log(`delete_plugin ${data.code} ${data.slot}`);

        const plugin_room = `plugin:${data.slot}`;
        io.in(plugin_room).socketsLeave(plugin_room);
        
        lazy.push(data.slot);
        instances[data.slot] = null;

        callback('ok');
    });

    socket.on("get_data", (data, callback) => {
        console.log(`get_data ${data.code} ${data.slot}`);
        callback(instances[data.slot]);
    });

    socket.on("set_data", (data, callback) => {
        console.log(`set_data ${data.code} ${data.slot} ${data.data}`);
        instances[data.slot] = data.data;
        callback('ok');
    });

    socket.on("plugin_broadcast", (data, callback) => {
        console.log(`plugin_broadcast ${data.code} ${data.slot} ${data.msg}`);
        const plugin_room = `plugin:${data.slot}`;
        socket.broadcast.to(plugin_room).emit(data.msg);     
    });

    socket.on("disconnect", () => {
        // todo: handle changing hosts
    });
});

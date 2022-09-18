import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

import { nanoid } from "nanoid";

const io = new Server(3000, {
  /* options */
});
const prisma = new PrismaClient();

let id_map: any = {}; // Map<Room Code, Map<Session ID, Username>>
let rooms: any = {}; // Map<Room Code, Ob

let instances: any = []; // Array<{x, y, data, host}>
let lazy: any = [];

io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (user) {
      socket.user = user;

      return next();
    } else {
      return next(new Error("Invalid user id"));
    }
  }
});

io.on("connection", async (socket) => {
  console.log("a user connected: " + socket.handshake.address);

  socket.on("user_register", async (data, callback) => {
    const user = await prisma.user.create({
      data: {
        name: data.name,
      },
    });

    callback(user.id);
  });

  socket.on("room_create", async (data, callback) => {
    if (!socket.user) return callback("Not logged in");

    socket.join(`room:${data.code}`);

    const room = await prisma.room.create({
      data: {
        code: data.code,
      },
    });

    callback(room.code);
  });

  socket.on("room_join", async (data, callback) => {
    if (!socket.user) return callback("Not logged in");

    socket.join(`room:${data.code}`);

    const user = await prisma.user.update({
      where: {
        id: socket.user.id,
      },
      data: {
        rooms: {
          connect: {
            code: data.code,
          },
        },
      },
    });

    return callback(room.id);
  });

  socket.on("send_message", (data, callback) => {
    if (!socket.user) return callback("Not logged in");

    socket.to(`room:${data.code}`).emit("message_sent", {
      username: socket.user.name,
      code: data.code,
      msg: data.msg,
    });
    callback("ok");
  });

  socket.on("plugin_instance_create", (data, callback) => {
    await pluginInstance = prisma.pluginInstance.create({
      positionX: 800,
      positionY: 500,
      data: {},
      pluginId: data.pluginId,
      room: data.roomId,
    });
    callback("ok");
  });

  /// TODO below

  socket.on("join_plugin", (data, callback) => {
    if (!instances[data.slot].host) {
      instances[data.slot].host = data.session_id;
      socket
        .to(`room:${data.code}`)
        .emit("set_host", { host: data.session_id });
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

    callback("ok");
  });

  socket.on("get_data", (data, callback) => {
    console.log(`get_data ${data.code} ${data.slot}`);
    callback(instances[data.slot]);
  });

  socket.on("set_data", (data, callback) => {
    console.log(`set_data ${data.code} ${data.slot} ${data.data}`);
    instances[data.slot] = data.data;
    callback("ok");
  });

  socket.on("send_plugin_broadcast", (data, callback) => {
    console.log(`plugin_broadcast ${data.code} ${data.slot} ${data.msg}`);
    const plugin_room = `plugin:${data.slot}`;
    socket.broadcast.to(plugin_room).emit("broadcasted_plugin_event", data.msg);
  });

  socket.on("disconnect", () => {
    // todo: handle changing hosts
  });
});

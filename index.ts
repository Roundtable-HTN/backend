// @ts-nocheck
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

import { nanoid } from "nanoid";
import express from "express";
import * as http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
server.listen(8080, () => {
  console.log(`Server listening on port 8080`);
});

app.use(express.static('../client/dist/'));

const prisma = new PrismaClient();

let id_map: any = {}; // Map<Room Code, Map<Session ID, Username>>
let rooms: any = {}; // Map<Room Code, Ob

let instances: any = []; // Array<{x, y, data, host}>
let lazy: any = [];

io.use(async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  console.log(`userid: ${userId}`);

  if (userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });


    console.log(userId);
    console.log(user);

    if (user) {
      // @ts-ignore
      socket.user = user;

      console.log(socket.user);

      return next();
    } else {
      return next(new Error("Invalid user id"));
    }
  }

  next();
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
    // @ts-ignore
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

    console.log(socket.rooms);

    const user = await prisma.user.update({
      where: {
        id: socket.user.id,
      },
      data: { 
        rooms: {
          connect: {
            // @ts-ignore
            code: data.code,
          },
        },
      },
    });

    const room = await prisma.room.findUnique({
      where: {
        // @ts-ignore
        code: data.code,
      },
    });

    // @ts-ignore
    return callback(room.id);
  });

  socket.on("send_message", (data, callback) => {
    console.log(socket.user);
    // @ts-ignore
    if (!socket.user) return callback("Not logged in");

    io.to(`room:${data.code}`).emit("message_sent", {
      // @ts-ignore
      username: socket.user.name,
      code: data.code,
      msg: data.msg,
    });
    callback("ok");
  });

  socket.on("plugin_instance_create", async (data, callback) => {
    // @ts-ignore
    if (!socket.user) return callback("Not logged in");

    const pluginInstance = await prisma.pluginInstance.create({
      // @ts-ignore
      positionX: 800,
      positionY: 500,
      pluginId: data.pluginId,
      room: data.roomId,
    });

    socket.broadcast.to(`room:${pluginInstanceId.room.code}`).emit("plugin_instance_created", {pluginInstanceId: pluginInstanceId.id});

    callback(pluginInstance.id);
  });

  socket.on("plugin_instance_join", async (data, callback) => {
    // @ts-ignore
    if (!socket.user) return callback("Not logged in");

    let pluginInstance = await prisma.pluginInstance.findUnique({
      where: {
        id: data.pluginInstanceId,
      },
    });

    if (!pluginInstance.host) {
      pluginInstance.hostId = socket.user.id;

      socket
        .to(`plugin:${pluginInstance.id}`)
        .emit("plugin_instance_host_set", { host: pluginInstance?.hostId });
    }

    pluginInstance = await prisma.pluginInstance.update({
      where: {
        id: pluginInstance?.id,
      },
      data: {
        users: {
          connect: {
            id: socket.user.id,
          },
        },
      },
    });

    socket.join(`plugin:${pluginInstance.id}`);

    socket.broadcast
      .to(`plugin:${pluginInstance.id}`)
      .emit("plugin_instance_user_join", { username: socket.user.name });

    callback(true);
  });

  socket.on("plugin_instance_leave", async (data, callback) => {
    if (!socket.user) return callback("Not logged in");

    let pluginInstance = await prisma.pluginInstance.findUnique({
      where: {
        id: data.pluginInstanceId,
      },
    });

    pluginInstance = await prisma.pluginInstance.update({
      where: {
        id: pluginInstance?.id,
      },
      data: {
        users: {
          disconnect: {
            id: socket.user!.id,
          },
        },
      },
    });

    // TODO Reselect host

    socket.broadcast
      .to(`plugin:${pluginInstance.id}`)
      .emit("plugin_instance_user_leave", { username: socket.user.name });

    socket.leave(`plugin:${data.pluginInstanceId}`);
  });

  socket.on("plugin_instance_delete", async (data, callback) => {
    if (!socket.user) return callback("Not logged in");

    const pluginInstance = await prisma.pluginInstance.findUnique({
      where: {
        id: data.pluginInstanceId,
      },
    });

    if (!pluginInstance) return callback("Plugin Instance does not exist");

    if (pluginInstance.users.size > 3)
      return callback("Error: People are still in the room");

    io.in(`plugin:${data.pluginInstanceId}`).socketsLeave(
      `plugin:${data.pluginInstanceId}`,
    );

    socket.broadcast.to(`room:${pluginInstanceId.room.code}`).emit("plugin_instance_deleted", {pluginInstanceId: pluginInstanceId.id});

    callback(true);
  });

  socket.on("plugin_instance_data_get", async (data, callback) => {
    const pluginInstance = await prisma.pluginInstance.findUnique({
      which: {
        id: data.pluginInstanceId,
      },
    });

    callback(pluginInstance?.data);
  });

  socket.on("plugin_instance_data_set", async (data, callback) => {
    const pluginInstance = await prisma.pluginInstance.findUnique({
      which: {
        id: data.pluginInstanceId,
      },
    });

    if (!pluginInstance) return callback("Plugin Instance does not exist");

    pluginInstance.data = data.data;

    callback(true);
  });

  socket.on("plugin_instance_broadcast", (data, callback) => {
    socket.broadcast
      .to(`plugin:${data.pluginInstanceId}`)
      .emit("plugin_instance_broadcasted", data.msg);
  });

  socket.on("list_users", async (data, callback) => {
    console.log(`list_users ${data.code}`);
    let users = await prisma.room.findFirst({ where: { code: data.code }}).users; //incorrect
    callback(users);
  });

  socket.on("disconnect", () => {
    // todo: handle changing hosts
  });
});

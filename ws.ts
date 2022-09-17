import { Server } from "socket.io";
import WebsocketEndpoints from "./websocket";

export default function (io: Server) {
    io.on("connection", (socket) => {
        WebsocketEndpoints.forEach(end => {
            socket.on(end.id, (content : any) => {
                end.call(content, socket, io);
            });
        })
    });
}
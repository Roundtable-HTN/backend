import * as express from "express";
import * as http from "http";
import { Server } from "socket.io";
import ws from './ws';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 8080;

app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.json({ strict: true })); // for parsing application/json
app.enable("trust proxy"); // behind a reverse proxy such as nginx
console.log('Initialized express');

app.use(express.static(`static`, { extensions: ['html'] }));
console.log("Set up static directory");

app.use("/", (req, res) => {
    res.status(404).json({ status: 404, error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

ws(io);

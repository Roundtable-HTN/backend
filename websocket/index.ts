import { Socket, Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

const endpoints : Endpoint[] = [

]

export default endpoints;

class Endpoint {
    id: string;
    call: (content : any, socket : Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, io : Server) => {};
    constructor({ id, call }: { id: string, call: () => {} }) {
        this.id = id;
        this.call = call;
    }
}

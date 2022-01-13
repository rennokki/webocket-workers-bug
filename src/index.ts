export class DurableObject {
    protected sockets = new Map<string, WebSocketWrapper>();

    async fetch(request) {
        // Handle websocket connections.
        if (request.headers.get('upgrade') === 'websocket') {
            return await this.newConnection();
        }

        // For non-websockets, it means it should be an HTTP request, and return the current sockets count
        // as a proof that after a while, the DO gets evicted.
        return new Response(JSON.stringify({ sockets: this.sockets.size }), {
            headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        });
    }

    async newConnection() {
        let [client, server] = Object.values(new WebSocketPair());

        let ws = new WebSocketWrapper(server);

        ws.connection.accept();

        // Hint #1: Might be the fact we use here `ws` within the handlers
        // and that would leave an open handler, causing the DO to stop?

        ws.connection.addEventListener('message', async event => {
            ws.connection.send('Pong');

            // Reset the timeout with each ping by the client,
            // meaning it is still there and we shouldn't disconnect it.
            await ws.updateTimeout();

            // The workaround here would be to trigger the DO's fetch() each time a listener gets triggered,
            // but that would trigger one DO request for each message received.
            await this.fetch(new Request('http://durable'));
        });

        ws.connection.addEventListener('close', async () => {
            this.sockets.delete(ws.id);
            await this.fetch(new Request('http://durable'));
        });

        this.sockets.set(ws.id, ws);

        ws.connection.send(`You're now connected. Your ID is ${ws.id}`);

        return new Response(null, { status: 101, webSocket: client });
    }
}

export default {
    async fetch(request, env) {
        let durableId = await env.DO.idFromName('not-important-id');
        let durableObject = await env.DO.get(durableId);

        return await durableObject.fetch(request);
    }
}

class WebSocketWrapper {
    public id: string;
    public timeout: any;

    constructor(public connection: WebSocket) {
        // Assign an unique ID to be able to remove the socket
        // from the list later.
        this.id = WebSocketWrapper.generateSocketId();

        // Start a timeout to force disconnect the connection
        // if > 120s passed and the client didn't ping.
        this.updateTimeout();
    }

    async updateTimeout(): Promise<void> {
        await this.clearTimeout();

        this.timeout = setTimeout(() => {
            try {
                this.connection.close(1000);
            } catch (e) {
                //
            }
        }, 120_000);
    }

    async clearTimeout(): Promise<void> {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }

    static generateSocketId(): string {
        let min = 0;
        let max = 10000000000;

        let randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        return randomNumber(min, max) + '.' + randomNumber(min, max);
    }
}

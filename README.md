Workers Bug
===========

This app demonstrates the buggy interaction between the Durable Object and existing WS connections.

When a new WS connection occurs, the DO gets called and is instantiated, accepts the new WS connection, then sets event handlers.

The websocket connection has, DO-side, a `pong` response to the periodically `ping` issued by the client every 30 seconds.

However, these `ping` and `pong` messages issued by both WebSockets (client and server) do not call the `.fetch()` method, and after a while, the DO stops, while the connection still persists, making it still be ping-pong-ing even if the DO is closed.

## 🚀 Installation

```bash
npm install
```

To build the `dist/index.mjs` file:

```bash
npm run build
```

## Deploy to dev/production

You must have `wrangler` installed if you want to deploy to live workers:

```bash
npm i -g @cloudflare/wrangler
```

Get a copy for your wrangler and configure it:

```bash
cp wrangler.toml wrangler.dist.toml
```

If you deploy for the first time on workers:

```bash
wrangler publish --new-tag="v1" --new-class DurableObject --config wrangler.dist.toml
```

Publish to live workers aftewards:

```bash
wrangler publish --new-tag="v1" --old-tag="v1" --config wrangler.dist.toml
```

## Testing the client

This proof  has a client with already configured (connection, sending pings, tracking all the messages).

Open the `client.html` file and change the `new Websocket(...)` section to connect to your worker.

Open the HTML file and you will see the messages: the assigned ID and every 30 seconds, a `Sent ping.` and `Pong` as a separate message.

After around 5 minutes or ~ 10 completed ping-pongs, make a HTTP GET request to the worker address and you will see that even if ping pongs are working, the HTTP returns `{ sockets: 0 }`.

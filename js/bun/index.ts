const server = Bun.serve<{
  username: string;
  room: string;
}>({
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const username = url.searchParams.get("username");
      const room = url.searchParams.get("room");

      if (!username || !room) {
        return new Response("Missing username or room", {
          status: 400,
        });
      }

      const success = server.upgrade(req, { data: { username, room } });
      return success
        ? undefined
        : new Response("WebSocket upgrade error", { status: 400 });
    }

    return new Response("Not found", {
      status: 404,
    });
  },
  websocket: {
    open(ws) {
      ws.subscribe(ws.data.room);
    },
    message(ws, message) {
      if (typeof message !== "string") return;
      const parsed = JSON.parse(message);

      if (parsed.type === "sendMessage" && typeof parsed.payload === "string") {
        server.publish(
          ws.data.room,
          JSON.stringify({
            type: "message",
            payload: {
              username: ws.data.username,
              message: parsed.payload,
              timestamp: new Date().toISOString(),
            },
          })
        );
      }
    },
  },
  port: process.env.PORT || 3000,
});

console.log("Listening on port", server.port);

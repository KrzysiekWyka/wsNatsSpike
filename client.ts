import WebSocket from "ws";
import Timeout = NodeJS.Timeout;
import logger from "./logger";

let socket: WebSocket;

let pingTimeout: Timeout;

const RECONNECT_TIMEOUT = 500;
const SOCKET_TIMEOUT = 30000;

const heartbeat = (socket: WebSocket) => {
  logger.info("Extend pingTimeout");

  clearTimeout(pingTimeout);

  pingTimeout = setTimeout(function() {
    logger.info("Terminating socket...");
    socket.terminate();
  }, SOCKET_TIMEOUT + 1000);
};

const reconnect = () => {
  logger.info(`Disconnected, reconnecting in ${RECONNECT_TIMEOUT}ms`);

  setTimeout(() => {
    logger.info("Reconnecting...");

    socket.close();
    socket.removeAllListeners();

    start();
  }, RECONNECT_TIMEOUT);
};

const start = () => {
  // TODO: Should be wss
  socket = new WebSocket("ws://localhost:3000", {
    headers: {
      Authorization:
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyIjp7Il9pZCI6IjVkNGQ3OWFhNDJlZTUzODc3MGY5NDRlYiIsInN0YXR1cyI6IkFDVElWRSIsInBob25lTnVtYmVyIjoiNTAxNTAyNTAzIn0sImdlbmVyYXRpb25UaW1lIjoiMjAxOS0wOC0xMlQxNDo0NToyMi4yMzRaIiwicmVmcmVzaFRpbWUiOiIyMDE5LTA4LTEyVDE0OjQ1OjIyLjIzNFoifQ.w7ZcCKWf225RTZ9klfgUk2zKmQyuna1hwPkFZulFlGQTCjX6JIs46r5F0OKMbvkOdOUjqPmnSkMj_DSXXZ4NnQ"
    }
  });

  socket.addEventListener("open", () => {
    heartbeat(socket);
  });

  socket.addEventListener("message", ({ data }) => {
    const response = JSON.parse(data.toString());

    if (response.type === "PING") {
      heartbeat(socket);

      socket.send(JSON.stringify({ type: "PONG" }));

      return;
    }

    logger.info(response, `Received message from server`);
  });

  socket.addEventListener("close", e => {
    clearTimeout(pingTimeout);

    reconnect();
  });

  socket.on("error", data => {
    console.log(data);
  });
};

start();

import WebSocket from 'ws';
import IEvent from "./interfaces/event.interface";
import Timeout = NodeJS.Timeout;
import logger from "./logger";
import {IResponse} from "./interfaces/response.interface";

let socket: WebSocket;

let pingTimeout: Timeout;

const RECONNECT_TIMEOUT = 500;
const SOCKET_TIMEOUT = 30000;

const CLIENT_NAME = process.argv[2];

const generateRandomNumber = () => Math.trunc(Math.random() * 100);

const heartbeat = (socket: WebSocket) => {
    logger.info('Extend pingTimeout');

    clearTimeout(pingTimeout);

    pingTimeout = setTimeout(function() {
        logger.info('Terminating socket...');

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


const askAboutMathSum = (x?: number, y?: number) => {
    socket.send(JSON.stringify({
        event: 'sum',
        data: {
            x: x || generateRandomNumber(),
            y: y || generateRandomNumber()
        }
    } as IEvent));
};

const logIn = () => {
    socket.send(JSON.stringify({
        event: 'login',
        data: {
            ticket: 'admin',
            clientName: CLIENT_NAME
        }
    } as IEvent));
};

const start = () => {
    // TODO: Should be wss
    socket = new WebSocket('ws://localhost:8181');

    socket.addEventListener('open', () => {
        heartbeat(socket);

        logIn();

        askAboutMathSum();
    });


    socket.addEventListener('message', ({data}) => {
        const response: IResponse = JSON.parse(data);

        logger.info({data: response},`Received ${!response.ok? 'error ': ''}response from server`);
    });

    socket.addEventListener('close', e => {
        clearTimeout(pingTimeout);

        reconnect();
    });

    socket.on('ping', () => {
        heartbeat(socket);
    });

    socket.on('error', () => {});
};

start();

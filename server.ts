// https://devcenter.heroku.com/articles/websocket-security
import WebSocket from 'ws';
import IEvent from './interfaces/event.interface';
import logger from "./logger";
import {ISumResponse} from "./interfaces/sum-response.interface";
import {IResponse} from "./interfaces/response.interface";
import {IErrorResponse} from "./interfaces/error-response.interface";
import {ILoginReponse} from "./interfaces/login-response.interface";
import * as _ from 'lodash';
import Hemera from 'nats-hemera';

const nats = require('nats').connect();

const hemera = new Hemera(nats, {
    logLevel: 'info',
    prettyLog: true
});

const PORT = process.env.PORT ||  8181;

const NODE_NAME = process.argv[2] || 'default';

hemera.meta$.node = NODE_NAME;

const wss = new WebSocket.Server({
    port: PORT,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
} as any);

type ExtendedWs = WebSocket & {isAlive?: boolean, ticket?: string, clientName?: string};

hemera.ready(() => {
    hemera.add(
        {topic: 'math', cmd: 'sum', pubsub$: true},
        function (req) {
            if (this.meta$.node !== NODE_NAME) {
                return;
            }

            const client = Array.from(wss.clients).find((client: ExtendedWs) => client.clientName === this.meta$.client);

            const query = JSON.stringify(<ISumResponse>{
                ok: true,
                sum: req.x + req.y
            });

            if (client) {
                client.send(query);
            } else {
                wss.clients.forEach(client => client.send(query));
            }
        });

    setInterval(() => {
        hemera.act({topic: 'system', cmd: 'time'}, (err, res) => {
            wss.clients.forEach(client => {
                client.send(JSON.stringify(<IResponse>{
                    ok: true,
                    time: res
                }));
            });
        });
    }, 15000);
});

wss.on('connection', (ws: ExtendedWs, req) => {
    ws.isAlive = true;

    const ip = req.connection.remoteAddress;

    logger.info(`Client ${ip} connected.`);

    ws.on('pong', () => {
        logger.info('Pong handled, setting isAlive = true');
        ws.isAlive = true;
    });

    ws.on('message', data => {
        const query: IEvent = JSON.parse(data.toString());

        logger.info({data: _.omit(query, ['event'])},`Event ${query.event} received from client.`);

        let response: IResponse = <IErrorResponse>{
            ok: false,
            error: {
             code: 1,
             msg: 'Event not found.'
            }
        };

        if (query.event === 'sum' && ws.ticket) {
            logger.info(`Calculating ${query.data.x} + ${query.data.y}...`);

            response = <ISumResponse>{
                ok: true,
                sum: query.data.x + query.data.y
            };

        } else if (query.event === 'login') {
            if (query.data.ticket === 'admin') {
                ws.ticket = query.data.ticket;

                response = <ILoginReponse>{
                    ok: true
                };

                ws.clientName = query.data.clientName;
            } else {

                response = <IErrorResponse>{
                    ok: false,
                    error: {
                        code: 2,
                        msg: 'Ticket is wrong.'
                    }
                }
            }
        }

        logger.info({data},`Sending ${!response.ok? 'error ': ''}response to client...`);

        ws.send(JSON.stringify(response));
    });
});

// Heart beating
setInterval(() => {
    logger.info('Searching connected client.');

    wss.clients.forEach((ws: ExtendedWs) => {
       if (!ws.isAlive) {
           logger.info('Socket is dead, terminating....');

           return ws.terminate();
       }

       ws.isAlive = false;

       logger.info('Is socket alive? Sending ping...');

       ws.ping(() => {});
    });
},30000);

logger.info(`Server listening on port ${PORT}`);

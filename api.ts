import express from 'express';
import Hemera from 'nats-hemera';

const nats = require('nats').connect();

const hemera = new Hemera(nats, {
    logLevel: 'info',
    prettyLog: true
});

hemera.ready(() => {
    hemera.add({
        topic: 'system',
        cmd: 'time',
    }, (req, cb) => {
        cb(undefined, new Date().getTime());
    });

    const app = express();
    const port = 3000;

    app.get('/', (req, res) => {
        hemera.act({
            topic: 'math',
            cmd: 'sum',
            x: +req.query.x || 1,
            y: +req.query.y || 2,
            meta$: { node: req.query.node || 'default', client: req.query.client || 'one' },
            pubsub$: true
        });

        res.send('Hello World!')
    });

    app.listen(port, () => console.log(`Example app listening on port ${port}!`));
});


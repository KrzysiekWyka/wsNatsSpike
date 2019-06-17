import pino from 'pino';

const logger = pino({
    prettyPrint: {
        translateTime: true
    },
});

export default logger;

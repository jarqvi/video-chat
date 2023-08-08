import * as http from 'node:http';
import * as path from 'node:path'
import pino from 'pino';
import { v4 } from 'uuid';
import * as express from 'express';
import * as createError from 'http-errors';
import { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Server } from 'socket.io';

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
        colorize: true
    }
    },
    stream: process.stdout
});
const app:Express = express();
const server: http.Server = http.createServer(app);
const io: Server = new Server(server);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response, next: NextFunction): void => {
    try {
        res.redirect(`/${ v4() }`);
    } catch (error) {
        next(error);
    }
});
app.get('/:room', (req: Request, res: Response, next: NextFunction): void => {
    try {
        res.render('room', { roomId: req.params.room });
    } catch (error) {
        next(error);
    }
});

io.on('connection', (socket): void => {
    socket.on('join-room', (roomId: string, userId: string) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-connected', userId);
        socket.on('disconnect', () => {
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });
    });
});

app.use((req: Request, res: Response, next: NextFunction): void => {
    next(createError.NotFound('Your page not found'));
});
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
    const statusCode = err.statusCode || createError.InternalServerError().statusCode;
    const message = err.message || createError.InternalServerError().message;

    res.status(statusCode).json({
        errors: {
            statusCode,
            message
        }
    });
})

server.listen(3000, (): void => {
    logger.info('Server started on port 3000');
});
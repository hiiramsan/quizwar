import express from 'express';
import cors from 'cors';
import roomsRouter from './routes/rooms.router.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Waiting for connections');
});

app.use('/api/rooms', roomsRouter);

app.use((req, res, next) => {
    res.status(404).json({ ok: false, message: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
});

export { app };

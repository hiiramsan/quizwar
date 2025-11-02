const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const rooms = new Map();

const makeRoomCode = (len = 5) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < len; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

app.get('/', (req, res) => {
    res.send('Waiting for connections');
});

app.post('/create-room', (req, res) => {
    const { hostName } = req.body || {};
    let code;
    do {
        code = makeRoomCode();
    } while (rooms.has(code));

    rooms.set(code, {
        hostSocketId: null,
        players: new Map(),
        createdAt: Date.now(),
        meta: { hostName: hostName || 'Host' },
        status: 'WAITING_FOR_PLAYERS'
    });

    return res.json({ ok: true, roomCode: code });
});

app.get('/rooms', (req, res) => {
    const list = Array.from(rooms.entries()).map(([code, room]) => ({
        code,
        players: room.players.size,
        hostName: room.meta.hostName,
        createdAt: room.createdAt
    }));
    res.json(list);
});

app.get('/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ ok: false, message: 'Room not found' });
    res.json({ ok: true, code });
});

app.use((req, res, next) => {
    res.status(404).json({ ok: false, message: 'Not found' });
});


app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
});

module.exports = {
    app,
    rooms,
    makeRoomCode
};

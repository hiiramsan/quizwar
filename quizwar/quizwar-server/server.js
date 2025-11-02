const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

const makeRoomCode = (len = 5) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < len; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code;
}

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


io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('joinRoom', ({ roomCode, name, isHost }) => {
        const room = rooms.get(roomCode);
        if (!room) {
            socket.emit('errorMessage', { message: 'Room not found' });
            return;
        }

        if (isHost) {
            room.hostSocketId = socket.id;
            room.meta.hostName = name || room.meta.hostName;
        }

        room.players.set(socket.id, { name: name, joinedAt: Date.now(), isHost: !!isHost });

        socket.join(roomCode);

        const playersList = Array.from(room.players.values()).map((p, _) => ({
            name: p.name,
            isHost: p.isHost
        }));

        socket.emit('joinedRoom', { roomCode, players: playersList });

        io.to(roomCode).emit('roomUpdated', {
            roomCode,
            players: playersList
        });

        console.log(`socket ${socket.id} joined ${roomCode} as ${name}, host=${isHost}`);
    });

    socket.on('leaveRoom', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;
        const isHostLeaving = room.hostSocketId === socket.id;

        room.players.delete(socket.id);
        socket.leave(roomCode);

        if (isHostLeaving) {
            io.to(roomCode).emit('roomClosed', { message: 'Host left, room closed' });

            for (const pid of room.players.keys()) {
                const s = io.sockets.sockets.get(pid);
                if (s) s.leave(roomCode);
            }

            rooms.delete(roomCode);
            console.log(`room ${roomCode} deleted because host left`);
            return;
        }

        io.to(roomCode).emit('roomUpdated', {
            roomCode,
            players: Array.from(room.players.values()).map(p => ({ name: p.name, isHost: p.isHost }))
        });
    });

    socket.on('disconnect', () => {
        for (const [code, room] of rooms.entries()) {
            if (!room.players.has(socket.id)) continue;

            const wasHost = room.hostSocketId === socket.id;
            room.players.delete(socket.id);
            socket.leave(code);

            if (wasHost) {
                io.to(code).emit('roomClosed', { message: 'Host disconnected, room closed' });

                for (const pid of room.players.keys()) {
                    const s = io.sockets.sockets.get(pid);
                    if (s) s.leave(code);
                }

                rooms.delete(code);
                console.log(`room ${code} deleted because host disconnected`);
                continue;
            }

            if (room.players.size === 0) {
                rooms.delete(code);
                console.log(`room ${code} deleted because empty`);
            } else {
                io.to(code).emit('roomUpdated', {
                    roomCode: code,
                    players: Array.from(room.players.values()).map(p => ({ name: p.name, isHost: p.isHost }))
                });
                console.log(`socket ${socket.id} disconnected and removed from room ${code}`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

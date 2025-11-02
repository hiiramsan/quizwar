const { rooms } = require('./app');

module.exports = function registerSocketHandlers(io) {
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

            const playersList = Array.from(room.players.values()).map((p) => ({
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
};

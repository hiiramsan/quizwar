import { createGame, deleteGame, getGame, updateGame } from '../managers/gameStateManager.js';

function registerRoomHandlers(io, socket) {

    socket.on('joinRoom', async ({ roomCode, name, isHost }) => {

        let game = await getGame(roomCode)

        if (!game) {
            socket.emit('joinFailed', { message: 'Invalid room code or room not yet created.' });
            return;
        }

        const isAlreadyJoined = game.players.some(p => p.socketId === socket.id);

        if (isHost) {
            room.hostSocketId = socket.id;
            room.meta.hostName = name || room.meta.hostName;
        }

        if (!isAlreadyJoined) {
            game.players.push({
                socketId: socket.id,
                name: name,
                joinedAt: Date.now(),
                isHost: !isHost
            });
        }

        try {
            await updateGame(roomCode, game);
        } catch (error) {
            console.log('Failed to persist player join to Redis', error);
            socket.emit('joinFailed', { message: 'Server error during join' });
            return;
        }

        socket.join(roomCode);

        const playersList = game.players.map(p => ({ name: p.name, isHost: p.isHost }));
        socket.emit('joinedRoom', { roomCode, players: playersList });
        io.to(roomCode).emit('roomUpdated', {
            roomCode,
            players: playersList
        });

        console.log(`socket ${socket.id} joined ${roomCode} as ${isHost}.`);

    });

    socket.on('leaveRoom', async ({ roomCode }) => {
        let game = await getGame(roomCode);
        if(!game) return;

        const isHostLeaving = game.host.socketId === socket.id;

        game.players = game.players.filter(p => p.socketId !== socket.id);
        socket.leave(roomCode);

        if(isHostLeaving) {
            io.to(roomCode).emit('roomClosed', {
                message: 'Host left, room closed'
            });

            try {
                await deleteGame(roomCode);
            } catch (error) {
                console.log(`Failed deleting room ${roomCode}`)
            }

            const socketsInRoom = await io.in(roomCode).allSockets();
            socketsInRoom.forEach(sid => {
                io.sockets.sockets.get(sid)?.leave(roomCode);
            });

            console.log(`Room ${roomCode} deleted because host left`);
        }

        await updateGame(roomCode, game);
        io.to(roomCode).emit('roomUpdated', {
            roomCode, 
            players: game.players.map(p => ({name: p.name, isHost: p.isHost}))
        });
    });

    socket.on('disconnect', async () => {
        for (const roomCode of socket.rooms) {
            if (roomCode === socket.id) continue; 
            
            let game = await getGame(roomCode);
            if (!game) continue;

            const wasHost = game.hostSocketId === socket.id;

            game.players = game.players.filter(p => p.socketId !== socket.id);
            socket.leave(roomCode);

            if (wasHost) {
                io.to(roomCode).emit('roomClosed', { message: 'Host disconnected, room closed' });

                try {
                    await deleteGame(roomCode);
                } catch (err) {
                    console.error(`Failed to delete room ${roomCode} from Redis on disconnect`, err);
                }
                console.log(`Room ${roomCode} deleted because host disconnected`);
                continue; 
            }
            
            if (game.players.length === 0) {
                 try {
                    await deleteGame(roomCode);
                } catch (err) {
                    console.error(`Failed to delete empty room ${roomCode} from Redis`, err);
                }
                console.log(`Room ${roomCode} deleted because empty`);
            } else {
                await updateGame(roomCode, game);
                
                io.to(roomCode).emit('roomUpdated', {
                    roomCode: roomCode,
                    players: game.players.map(p => ({ name: p.name, isHost: p.isHost }))
                });
                console.log(`Socket ${socket.id} disconnected and removed from room ${roomCode}`);
            }
        }
    });
}

export default registerRoomHandlers;
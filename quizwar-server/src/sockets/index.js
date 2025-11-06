import registerRoomHandlers from './roomHandlers.js';

export default function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('socket connected', socket.id);
        registerRoomHandlers(io, socket);
    });
}
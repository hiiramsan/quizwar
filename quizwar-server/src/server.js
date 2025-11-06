import { createServer } from 'http';
const { Server } = require('socket.io');
const PORT = process.env.PORT || 3000;

const { app, rooms } = require('./app');
const { registerSocketHandlers } = require('./sockets/index');

const server = createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

registerSocketHandlers(io);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

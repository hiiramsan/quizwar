import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './src/app.js';
import registerSocketHandlers from './src/sockets/index.js';

const PORT = process.env.PORT || 3000;

const server = createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

registerSocketHandlers(io);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

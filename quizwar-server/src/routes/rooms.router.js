import express from 'express';
import { createRoom, getRoom } from '../controllers/rooms.controller.js';

const roomsRouter = express.Router();

roomsRouter.post('/create', createRoom);

roomsRouter.get('/:code', getRoom);

export default roomsRouter;

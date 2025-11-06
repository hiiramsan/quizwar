import { createGame, getGame } from "../managers/gameStateManager.js";
import { makeRoomCode } from "../utils/makeRoomCode.js";

export const createRoom = async (req, res) => {
    const { hostName } = req.body || {};
    let code = makeRoomCode();
    const roomObj = {
        hostSocketId: null,
        players: new Map(),
        createdAt: Date.now(),
        meta: { hostName: hostName || 'Host' },
        status: 'WAITING_FOR_PLAYERS'
    };

    const initialState = {
        hostName: roomObj.meta.hostName,
        createdAt: roomObj.createdAt,
        status: roomObj.status,
        players: []
    };

    try {
        await createGame(code, initialState);
    } catch (err) {
        console.error('Failed to persist room to Redis', err);
    }

    return res.json({ ok: true, roomCode: code });
}

export const getRoom = async (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = await getGame(code)
    if (!room) return res.status(404).json({ ok: false, message: 'Room not found' });

    try {
        res.json({ ok: true, room });
    } catch (error) {
        console.error('Error processing room data:', error);
        res.status(500).json({ ok: false, message: 'Server error retrieving room data.' });
    }

}
import redis from '../data/redisClient.js';

const GAME_KEY_PREFIX = 'game:';

export async function createGame(pin, initialState) {
    const key = GAME_KEY_PREFIX + pin;
    const value = JSON.stringify(initialState);
    await redis.set(key, value, 'EX', 86400);
    return true;
}

export async function getGame(pin) {
    const key = GAME_KEY_PREFIX + pin;
    const result = await redis.get(key);
    if (!result) {
        return null;
    }
    return JSON.parse(result);
}

export async function updateGame(pin, updatedState) {
    const key = GAME_KEY_PREFIX + pin;
    const value = JSON.stringify(updatedState);
    await redis.set(key, value, 'KEEPTTL');
    return true;
}

export async function deleteGame(pin) {
    const key = GAME_KEY_PREFIX + pin;
    await redis.del(key);
}
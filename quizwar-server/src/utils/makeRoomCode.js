// TODO:  here it should check if code already exists in redis
export const makeRoomCode = (len = 5) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < len; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};
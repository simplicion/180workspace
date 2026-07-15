module.exports = (io, socket, onlineUsers) => {
    const userId = socket.userId;

    socket.on('call:initiate', ({ recipientId, roomId, type, chatName }) => {
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets && recipientSockets.size > 0) {
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('call:request', {
                    callerId: userId,
                    callerName: socket.user.name,
                    callerPhoto: socket.user.photoUrl,
                    roomId,
                    type,
                    chatName
                });
            });
        } else {
            socket.emit('call:error', { message: 'User is offline' });
        }
    });

    socket.on('call:response', ({ callerId, roomId, accepted }) => {
        const callerSockets = onlineUsers.get(callerId);
        if (callerSockets && callerSockets.size > 0) {
            callerSockets.forEach(socketId => {
                io.to(socketId).emit('call:response', { recipientId: userId, accepted, roomId });
            });
        }
    });
};

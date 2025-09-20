module.exports = (socket) => {
  socket.on('send_message', async (data) => {
    // save message to DB
    // send to recipient socket if online
  });

  socket.on('message_read', async (data) => {
    // update read receipt
    // notify sender
  });
};

require('dotenv').config();
// server.js
const http = require("http");
const app = require("./app");
const PORT = process.env.PORT || 5000;

// Create HTTP server with Express app
const server = http.createServer(app);

// Initialize custom socket gateway
const io = require("./realtime/socket")(server);
app.set("io", io)

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

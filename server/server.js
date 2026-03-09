require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const createApp = require("./app");

const app = createApp();

// --- CONNECT TO DATABASE ---
connectDB();

// --- SERVER & SOCKET INITIALIZATION ---
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  logger.info(`[Socket] Dashboard connected: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`[Socket] Dashboard disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  logger.info(`[${process.env.NODE_ENV}] Server listening on port ${PORT}`);
});


const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

// Uncaught Exception
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting Down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });

const app = require("./App");
const { db } = require("./models/UserModel");
const { setIO } = require("./serverMQtt");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
mongoose.connect(DB).then(async (con) => {
  console.log("DB connection successful!");
});

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);

// Store admin and client connections
let adminSocket = null;
let clientSocket = null;

// Set up Socket.IO connection
io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  // Handle admin connection
  socket.on("admin_connect", () => {
    if (adminSocket) {
      socket.emit("error", "Admin already connected");
      return;
    }
    adminSocket = socket;
    console.log("Admin connected:", socket.id);
    socket.join("admin_room");
  });

  // Handle client connection
  socket.on("client_connect", (carID) => {
    if (clientSocket) {
      socket.emit("error", "Client already connected");
      return;
    }
    clientSocket = socket;
    console.log("Client connected:", socket.id, "Car ID:", carID);
    socket.join(`car_${carID}`);
  });

  socket.on("disconnect", () => {
    if (socket === adminSocket) {
      console.log("Admin disconnected");
      adminSocket = null;
    } else if (socket === clientSocket) {
      console.log("Client disconnected");
      clientSocket = null;
    }
  });
});

// Pass io instance to MQTT server
setIO(io);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Unhandled Rejection
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});

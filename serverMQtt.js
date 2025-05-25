const mqtt = require("mqtt");
const { Server } = require("socket.io");

const broker = "mqtt://test.mosquitto.org:1883";
const Topic = "locationUpdate";
const INACTIVITY_THRESHOLD = 1 * 60 * 1000; // 5 minutes in milliseconds
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123"; // Change this in production

// Store admin socket and io instance
let adminSocket = null;
let io = null;
let lastMessageTime = Date.now();
let inactivityTimer = null;
let connectedClients = new Map(); // Store connected clients with their status

// MQTT client
const client = mqtt.connect(broker);

// Function to handle admin authentication
function handleAdminAuth(socket, secret) {
  if (secret === ADMIN_SECRET) {
    // If there's already an admin connected, reject the new connection
    if (adminSocket) {
      socket.emit("adminAuthError", {
        message: "Another admin is already connected",
        timestamp: new Date().toISOString(),
      });
      socket.disconnect();
      return false;
    }

    // Set as admin
    adminSocket = socket.id;
    console.log("Admin authenticated with ID:", socket.id);

    // Send confirmation
    socket.emit("adminConfirmation", {
      message: "You are connected as admin",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
    return true;
  } else {
    socket.emit("adminAuthError", {
      message: "Invalid admin credentials",
      timestamp: new Date().toISOString(),
    });
    socket.disconnect();
    return false;
  }
}

// Function to handle admin disconnection
function handleAdminDisconnection(socket) {
  if (adminSocket === socket.id) {
    console.log("Admin disconnected:", socket.id);
    adminSocket = null;

    // Notify all clients that admin is disconnected
    io.emit("adminDisconnected", {
      message: "Admin has disconnected",
      timestamp: new Date().toISOString(),
    });
  }
}

// Function to handle client disconnection
function handleClientDisconnection(socket) {
  console.log("Client disconnected:", socket.id);

  // Update client status
  if (connectedClients.has(socket.id)) {
    const clientInfo = connectedClients.get(socket.id);
    clientInfo.status = "disconnected";
    clientInfo.lastDisconnect = new Date();
    connectedClients.set(socket.id, clientInfo);
  }

  // Clear admin socket if it was the admin
  if (adminSocket === socket.id) {
    adminSocket = null;
    console.log("Admin disconnected");
  }

  // Notify other clients about the disconnection
  socket.broadcast.emit("clientDisconnected", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });
}

// Function to handle client reconnection
function handleClientReconnection(socket) {
  console.log("Client reconnected:", socket.id);

  // Update client status
  if (connectedClients.has(socket.id)) {
    const clientInfo = connectedClients.get(socket.id);
    clientInfo.status = "connected";
    clientInfo.reconnectionCount = (clientInfo.reconnectionCount || 0) + 1;
    clientInfo.lastReconnect = new Date();
    connectedClients.set(socket.id, clientInfo);
  } else {
    // New client
    connectedClients.set(socket.id, {
      status: "connected",
      connectedAt: new Date(),
      reconnectionCount: 0,
    });
  }

  // Notify the reconnected client about current state
  socket.emit("reconnectionStatus", {
    socketId: socket.id,
    status: "reconnected",
    timestamp: new Date().toISOString(),
    isAdmin: adminSocket === socket.id,
  });

  // Notify other clients about the reconnection
  socket.broadcast.emit("clientReconnected", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });
}

// Function to initialize MQTT with existing HTTP server
function initializeMQTT(httpServer) {
  // Create Socket.IO server using the existing HTTP server
  io = new Server(httpServer, {
    cors: {
      origin: "*", // You might want to restrict this in production
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log("New connection attempt:", socket.id);

    // Handle admin authentication
    socket.on("authenticateAdmin", (secret) => {
      handleAdminAuth(socket, secret);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      handleAdminDisconnection(socket);
    });

    // Handle admin status request
    socket.on("getAdminStatus", () => {
      socket.emit("adminStatus", {
        isAdmin: adminSocket === socket.id,
        adminSocketId: adminSocket,
        timestamp: new Date().toISOString(),
      });
    });

    // Initialize client in the map
    connectedClients.set(socket.id, {
      status: "connected",
      connectedAt: new Date(),
      reconnectionCount: 0,
    });

    // Handle disconnection
    socket.on("disconnect", () => handleClientDisconnection(socket));

    // Handle reconnection
    socket.on("reconnect", () => handleClientReconnection(socket));

    // Handle client status request
    socket.on("getClientStatus", () => {
      const clientInfo = connectedClients.get(socket.id);
      socket.emit("clientStatus", {
        socketId: socket.id,
        status: clientInfo?.status || "unknown",
        connectedAt: clientInfo?.connectedAt,
        reconnectionCount: clientInfo?.reconnectionCount || 0,
        isAdmin: adminSocket === socket.id,
      });
    });
  });

  console.log("MQTT and Socket.IO services initialized");
}

// Function to publish a message
function publishMessage(message, topic) {
  client.publish(topic, JSON.stringify(message), (err) => {
    if (err) {
      console.error("Error publishing message:", err);
    } else {
      console.log(`Message published to ${topic}:`, message);
    }
  });
}

// Function to ring a car
function RingCar(carID) {
  publishMessage({ action: "ring" }, `Ring_${carID}`);
}

// Function to check for inactivity
function checkInactivity() {
  const currentTime = Date.now();
  const timeSinceLastMessage = currentTime - lastMessageTime;

  if (timeSinceLastMessage >= INACTIVITY_THRESHOLD) {
    console.log("No MQTT messages received for 5 minutes");
    console.log("Current admin socket ID:", adminSocket);

    if (adminSocket && io) {
      console.log("Attempting to emit inactivity to admin:", adminSocket);
      io.emit("mqttInactivity", {
        message: "No MQTT messages received for 5 minutes",
        lastMessageTime: new Date(lastMessageTime).toISOString(),
        socketId: adminSocket,
      });
    } else {
      console.log("Cannot emit to admin - adminSocket or io is not available");
    }
  }
}

// Handle MQTT connection
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  // Subscribe to the topic
  client.subscribe(Topic, (err) => {
    if (err) {
      console.error("Subscription error:", err);
    } else {
      console.log(`Subscribed to ${Topic}`);
      // Start inactivity check timer
      inactivityTimer = setInterval(checkInactivity, 60000); // Check every minute
    }
  });
});

// Handle incoming messages
client.on("message", (topic, message) => {
  lastMessageTime = Date.now(); // Update last message time
  console.log("Received message on topic:", topic);
  const messageStr = message.toString();

  try {
    // Try to parse as JSON first
    const data = JSON.parse(messageStr);
    console.log("Message data:", data);

    if (topic === "locationUpdate") {
      // Handle both possible data structures
      const carID = data.carID || data.id;
      const latitude = data.latitude || data.lat;
      const longitude = data.longitude || data.lon;
      const batteryLow = data.status || data.batteryLow;

      if (latitude !== undefined && longitude !== undefined) {
        console.log(
          `Location received: ${latitude}, ${longitude}${
            carID ? ` (Car: ${carID})` : ""
          }`
        );

        // Send location update to all connected clients
        const locationData = {
          carID,
          latitude,
          longitude,
          batteryLow,
          timestamp: new Date().toISOString(),
        };

        // Emit to all connected clients
        io.emit("locationUpdate", locationData);
      } else {
        console.log("Received location data with missing coordinates:", data);
      }
    }
  } catch (error) {
    // If JSON parsing fails, log the raw message
    console.log("Received non-JSON message:", messageStr);
  }
});

// Handle MQTT errors
client.on("error", (err) => {
  console.error("MQTT connection error:", err);
});

// Handle MQTT disconnection
client.on("close", () => {
  console.log("Disconnected from MQTT broker");
  if (inactivityTimer) {
    clearInterval(inactivityTimer);
  }
});

// Export the functions and initialization function
module.exports = {
  initializeMQTT,
  publishMessage,
  RingCar,
  getIO: () => io,
  getConnectedClients: () => Array.from(connectedClients.entries()),
  getAdminStatus: () => ({
    isAdminConnected: adminSocket !== null,
    adminSocketId: adminSocket,
  }),
};

const mqtt = require("mqtt");
const { Server } = require("socket.io");

const broker = "mqtt://test.mosquitto.org:1883";
const Topic = "locationUpdate";

// Store admin socket and io instance
let adminSocket = null;
let io = null;

// MQTT client
const client = mqtt.connect(broker);

// Function to initialize MQTT with existing HTTP server
function initializeMQTT(httpServer) {
  // Create Socket.IO server using the existing HTTP server
  io = new Server(httpServer, {
    cors: {
      origin: "*", // You might want to restrict this in production
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log("Socket.IO client connected:", socket.id);
    // Set this connection as admin
    adminSocket = socket.id;
    console.log("Admin connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // Clear admin socket when disconnected
      if (adminSocket === socket.id) {
        adminSocket = null;
      }
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

// Handle MQTT connection
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  // Subscribe to the topic
  client.subscribe(Topic, (err) => {
    if (err) {
      console.error("Subscription error:", err);
    } else {
      console.log(`Subscribed to ${Topic}`);
    }
  });
});

// Handle incoming messages
client.on("message", (topic, message) => {
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
          timestamp: new Date().toISOString(),
        };

        // Emit to all connected clients instead of just admin
        io.emit("locationUpdate", locationData);
        console.log("Emitted location update to all clients");
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
});

// Export the functions and initialization function
module.exports = {
  initializeMQTT,
  publishMessage,
  RingCar,
  getIO: () => io, // Getter function to access io instance
};

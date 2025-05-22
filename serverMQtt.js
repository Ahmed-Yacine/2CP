const mqtt = require("mqtt");
const broker = "mqtt://test.mosquitto.org:1883";
const receiveTopic = "locationUpdate";
const publishTopic = "locationUpdate_send";

// Get the io instance from server.js
let io;
function setIO(ioInstance) {
  io = ioInstance;
}

// Store last received timestamp for each car
const carLastSeen = new Map();
const TIMEOUT_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds

// Function to check for inactive cars
function checkInactiveCars() {
  const now = Date.now();
  carLastSeen.forEach((lastSeen, carID) => {
    if (now - lastSeen > TIMEOUT_DURATION) {
      // Send notification to admin
      if (io) {
        io.to("admin_room").emit("car_inactive", {
          type: "car_inactive",
          carID,
          lastSeen: new Date(lastSeen).toISOString(),
          message: `Car ${carID} has not sent location data for more than 3 minutes`,
        });
      }
    }
  });
}

// Check for inactive cars every minute
setInterval(checkInactiveCars, 60000);

const client = mqtt.connect(broker);

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

// Function to send location to admin
function sendLocationToAdmin(data) {
  if (io) {
    // Send to admin room
    io.to("admin_room").emit("location_update", data);
  }
}

// Handle connection
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  // Subscribe to the topic
  client.subscribe(receiveTopic, (err) => {
    if (err) {
      console.error("Subscription error:", err);
    } else {
      console.log(`Subscribed to ${receiveTopic}`);
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

        // Update last seen timestamp for the car
        if (carID) {
          carLastSeen.set(carID, Date.now());
        }

        // Send location data to admin in real-time
        sendLocationToAdmin({
          type: "location_update",
          carID,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log("Received location data with missing coordinates:", data);
      }
    }
  } catch (error) {
    // If JSON parsing fails, log the raw message
    console.log("Received non-JSON message:", messageStr);
  }
});

// Handle errors
client.on("error", (err) => {
  console.error("Connection error:", err);
});

// Handle disconnection
client.on("close", () => {
  console.log("Disconnected from MQTT broker");
  process.exit(0);
});

// Export the functions
module.exports = {
  publishMessage,
  RingCar,
  setIO,
};

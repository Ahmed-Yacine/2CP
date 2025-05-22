const mqtt = require("mqtt");
const broker = "mqtt://test.mosquitto.org:1883";
const receiveTopic = "locationUpdate";
const publishTopic = "locationUpdate_send";

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
};

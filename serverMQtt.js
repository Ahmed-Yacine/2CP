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
  try {
    const data = JSON.parse(message.toString());
    console.log("Message data:", data);

    if (topic === "locationUpdate") {
      const { carID, longitude, latitude } = data;
      console.log(`Car ${carID} location: ${latitude}, ${longitude}`);
    }
  } catch (error) {
    console.error("Error parsing message:", error);
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
  RingCar
};

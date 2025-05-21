const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Add index for faster queries
locationSchema.index({ bookingId: 1, timestamp: -1 });

// Add method to get coordinates as array [longitude, latitude]
locationSchema.methods.getCoordinates = function () {
  return [this.longitude, this.latitude];
};

// Add static method to create location from coordinates
locationSchema.statics.createFromCoordinates = function (
  longitude,
  latitude,
  bookingId
) {
  return this.create({
    longitude,
    latitude,
    bookingId,
  });
};

const Location = mongoose.model("Location", locationSchema);

module.exports = Location;

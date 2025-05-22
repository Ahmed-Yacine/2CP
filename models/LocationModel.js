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
      type: mongoose.Schema.ObjectId,
      ref: "Booking",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add index for faster queries
locationSchema.index({ bookingId: 1, createdAt: -1 });

// Add post-save middleware to update booking's locations array
locationSchema.post("save", async function () {
  const Booking = mongoose.model("Booking");
  await Booking.findByIdAndUpdate(
    this.bookingId,
    { $push: { locations: this._id } },
    { new: true }
  );
});

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

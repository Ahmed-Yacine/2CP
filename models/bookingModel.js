const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    car: {
      type: mongoose.Schema.ObjectId,
      ref: "Car",
      required: [true, "Booking must belong to a car"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Booking must belong to a user"],
    },
    locations: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: "Location",
        },
      ],
      default: [],
    },
    startDate: {
      type: Date,
      required: [true, "Please provide the start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please provide the end date"],
    },
    duration: {
      type: Object,
      default: function () {
        const startDate = new Date(this.startDate);
        const endDate = new Date(this.endDate);

        // Add one day to endDate to include the last day
        endDate.setDate(endDate.getDate() + 1);

        const timeDifference = endDate - startDate;

        const daysInMonth = (date) => {
          return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        };

        let totalDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        let months = 0;
        let currentDate = new Date(startDate);

        while (totalDays >= daysInMonth(currentDate)) {
          totalDays -= daysInMonth(currentDate);
          currentDate.setMonth(currentDate.getMonth() + 1);
          months++;
        }

        const days = totalDays;
        return { months, days };
      },
    },
    totalCost: Number,
    paid: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "ongoing",
        "rejected",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for better query performance
bookingSchema.index({ status: 1 }); // Index on status field
// Static method to update booking statuses automatically
bookingSchema.statics.updateBookingStatuses = async function () {
  const now = new Date();

  // Update approved bookings to ongoing
  await this.updateMany(
    {
      status: "approved",
      startDate: { $lte: now },
    },
    {
      $set: { status: "ongoing" },
    }
  );

  // Update ongoing bookings to completed
  await this.updateMany(
    {
      status: "ongoing",
      endDate: { $lte: now },
    },
    {
      $set: { status: "completed" },
    }
  );
};

// Schedule status updates to run every 10 seconds
bookingSchema.statics.scheduleStatusUpdates = function () {
  // Function to run the update
  const runUpdate = async () => {
    try {
      await this.updateBookingStatuses();
      // console.log(
      //   "Booking statuses updated successfully at:",
      //   new Date().toISOString()
      // );
    } catch (error) {
      console.error("Error updating booking statuses:", error);
    }
  };

  // Run immediately
  runUpdate();

  // Then run every 10 seconds
  setInterval(runUpdate, 10 * 1000); // 10 seconds

  // console.log("Booking status updates scheduled to run every 10 seconds");
};

bookingSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
  })
    .populate({
      path: "car",
      select: "name model registrationNumber",
    })
    .populate({
      path: "locations",
      select: "longitude latitude createdAt",
    });
  next();
});

bookingSchema.pre("save", async function (next) {
  // Only validate dates for new bookings
  if (this.isNew) {
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate > endDate) {
      throw new Error("Start date must be before end date");
    } else if (startDate < today) {
      throw new Error("Start date must be today or in the future");
    }
  }

  const Car = mongoose.model("Car");
  const car = await Car.findById(this.car);
  if (!car) {
    throw new Error("Car not found");
  }

  const carRatePerDay = car.dailyRate;
  const carRatePerMonth = car.monthlyRate;
  const duration = this.duration;
  this.totalCost =
    duration.months * carRatePerMonth + duration.days * carRatePerDay;

  next();
});

const Booking = mongoose.model("Booking", bookingSchema);

// Start the scheduler when the model is first loaded
Booking.scheduleStatusUpdates();

module.exports = Booking;

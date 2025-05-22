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
        const timeDifference = endDate - startDate;

        const daysInMonth = (date) => {
          return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        };

        let totalDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        let months = 0;

        while (totalDays >= daysInMonth(startDate)) {
          totalDays -= daysInMonth(startDate);
          startDate.setMonth(startDate.getMonth() + 1);
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

// Static method to update booking statuses automatically
bookingSchema.statics.updateBookingStatuses = async function () {
  const now = new Date();

  // Update approved bookings to ongoing
  const approvedBookings = await this.find({
    status: "approved",
    startDate: { $lte: now },
  });

  for (const booking of approvedBookings) {
    booking.status = "ongoing";
    await booking.save();
  }

  // Update ongoing bookings to completed
  const ongoingBookings = await this.find({
    status: "ongoing",
    endDate: { $lte: now },
  });

  for (const booking of ongoingBookings) {
    booking.status = "completed";
    await booking.save();
  }
};

// Schedule status updates to run every 24 hours
bookingSchema.statics.scheduleStatusUpdates = function () {
  // Calculate time until next midnight
  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight - now;
  };

  // Function to run the update
  const runUpdate = async () => {
    try {
      await this.updateBookingStatuses();
      console.log(
        "Booking statuses updated successfully at:",
        new Date().toISOString()
      );
    } catch (error) {
      console.error("Error updating booking statuses:", error);
    }
  };

  // Schedule the first run at midnight
  setTimeout(() => {
    // Run immediately
    runUpdate();

    // Then run every 24 hours
    setInterval(runUpdate, 24 * 60 * 60 * 1000);
  }, getTimeUntilMidnight());

  // Log when the next update will occur
  console.log(
    "Next booking status update scheduled for:",
    new Date(Date.now() + getTimeUntilMidnight()).toISOString()
  );
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
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    throw new Error("Start date must be before end date");
  } else if (startDate < today) {
    throw new Error("Start date must be today or in the future");
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

const mongoose = require("mongoose");

// TODO: Implement the functionality to cancel the booking if the user doesn't pay within 24 hours of the booking.

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
    startDate: {
      type: String,
      required: [true, "Please provide the start date"],
    },
    endDate: {
      type: String,
      required: [true, "Please provide the end date"],
    },
    receiptPhoto: {
      type: String,
      required: [true, "Please provide the receipt photo"]
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
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.pre(/^find/, function (next) {
  this.populate("user").populate({
    path: "car",
    select: "name model registrationNumber",
  });
  next();
});

bookingSchema.pre("save", async function (next) {
  if (new Date(this.startDate) > new Date(this.endDate)) {
    throw new Error("Start date must be before end date");
  } else if (new Date(this.startDate) < new Date()) {
    throw new Error("Start date must be in the future");
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
module.exports = Booking;

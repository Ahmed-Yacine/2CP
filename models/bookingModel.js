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
    startDate: {
      type: String,
      required: [true, "Please provide the start date"],
    },
    startHour: {
      type: Number,
      required: [true, "Please provide the start hour"],
    },
    endDate: {
      type: String,
      required: [true, "Please provide the end date"],
    },
    endHour: {
      type: Number,
      required: [true, "Please provide the end hour"],
    },
    duration: {
      type: Object,
      default: function () {
        const startDateParts = this.startDate.split("-");
        const endDateParts = this.endDate.split("-");

        const startYear = parseInt(startDateParts[0]);
        const startMonth = parseInt(startDateParts[1]) - 1; // JavaScript months are 0-based
        const startDay = parseInt(startDateParts[2]);

        const endYear = parseInt(endDateParts[0]);
        const endMonth = parseInt(endDateParts[1]) - 1;
        const endDay = parseInt(endDateParts[2]);

        const startDateTime = new Date(
          startYear,
          startMonth,
          startDay,
          this.startHour
        );
        const endDateTime = new Date(endYear, endMonth, endDay, this.endHour);

        const durationInMilliseconds = endDateTime - startDateTime;
        const durationInHours = durationInMilliseconds / 3600000;
        const totalDays = Math.floor(durationInHours / 24);
        const hours = durationInHours % 24;
        const months = Math.floor(totalDays / 30);
        const days = totalDays % 30;

        return {
          months: months,
          days: days,
          hours: hours,
        };
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
  if (this.startDate > this.endDate) {
    throw new Error("Start date must be before end date");
  } else if (new Date(this.startDate) < new Date()) {
    throw new Error("Start date must be in the future");
  }

  const Car = mongoose.model("Car");
  const car = await Car.findById(this.car);
  if (!car) {
    throw new Error("Car not found");
  }

  const carRatePerHour = car.hourlyRate;
  const carRatePerDay = carRatePerHour * 24;
  const carRatePerMonth = carRatePerDay * 30;
  const duration = this.duration;
  this.totalCost =
    duration.months * carRatePerMonth +
    duration.days * carRatePerDay +
    duration.hours * carRatePerHour;

  next();
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;

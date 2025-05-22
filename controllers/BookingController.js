const Booking = require("../models/bookingModel");
const Location = require("../models/LocationModel");
const factory = require("./HandlerFactory");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");

exports.setCarUserIds = (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find()
    .populate({
      path: "car",
      select: "-__v",
    })
    .populate({
      path: "user",
      select: "name email photo",
    })
    .populate({
      path: "locations",
      select: "longitude latitude createdAt",
      options: { sort: { createdAt: -1 } },
    });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

exports.getBooking = factory.getOne(Booking);

exports.createBooking = catchAsync(async (req, res, next) => {
  const doc = await Booking.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

exports.getMonthlyBookingsStats = catchAsync(async (req, res) => {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const endOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  );

  const stats = await Booking.aggregate([
    {
      $match: {
        paid: true,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalCost" },
        totalBookings: { $sum: 1 },
        totalCancelled: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data:
      stats.length > 0
        ? stats[0]
        : { totalRevenue: 0, totalBookings: 0, totalCancelled: 0 },
  });
});

exports.getYearlyBookingsStats = catchAsync(async (req, res) => {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
  const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59); // December 31st of current year

  const stats = await Booking.aggregate([
    {
      $match: {
        paid: true,
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalCost" },
        totalBookings: { $sum: 1 },
        totalCancelled: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data:
      stats.length > 0
        ? stats[0]
        : { totalRevenue: 0, totalBookings: 0, totalCancelled: 0 },
  });
});

exports.cancelBookingForCurrentUser = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!booking) {
    return next(
      new AppError("No booking found with that ID for the current user", 404)
    );
  }

  booking.status = "cancelled";
  await booking.save();

  res.status(200).json({
    status: "success",
    data: {
      booking,
    },
  });
});

exports.getAllCarsForTracking = catchAsync(async (req, res) => {
  // Update booking statuses before fetching ongoing bookings
  await Booking.updateBookingStatuses();

  // Find bookings with status "ongoing" and populate the car details
  const bookings = await Booking.find({ status: "ongoing" })
    .populate({
      path: "car",
      select: "-__v", // Include all car fields except __v
    })
    .populate({
      path: "user",
      select: "name email photo", // Include only essential user information
    })
    .populate({
      path: "locations",
      select: "longitude latitude createdAt", // Include location coordinates and timestamp
      options: { sort: { createdAt: -1 } }, // Get the most recent locations first
    });

  // Extract the cars from the bookings with user and booking info
  const carsWithInfo = bookings.map((booking) => ({
    car: booking.car,
    user: booking.user,
    booking: {
      locations: booking.locations,
      _id: booking._id,
      startDate: booking.startDate,
      endDate: booking.endDate,
    },
    latestLocation: booking.locations[0] || null, // Get the most recent location
  }));

  res.status(200).json({
    status: "success",
    results: carsWithInfo.length,
    data: {
      carsWithInfo,
    },
  });
});

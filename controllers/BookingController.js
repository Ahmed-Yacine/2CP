const Booking = require("../models/bookingModel");
const Location = require("../models/LocationModel");
const Car = require("../models/CarModel");
const factory = require("./HandlerFactory");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");
const CarAvailabilityService = require("./../Utils/CarAvailability");

exports.setCarUserIds = (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// NEW: Check car availability endpoint
exports.checkCarAvailability = catchAsync(async (req, res, next) => {
  const { carId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(
      new AppError("Please provide both start date and end date", 400)
    );
  }

  // Validate dates
  const dateValidation = CarAvailabilityService.validateBookingDates(
    startDate,
    endDate
  );
  if (!dateValidation.valid) {
    return next(new AppError(dateValidation.message, 400));
  }

  // Check if car exists
  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError("Car not found", 404));
  }

  // Check availability
  const availabilityCheck = await CarAvailabilityService.checkCarAvailability(
    carId,
    startDate,
    endDate
  );

  res.status(200).json({
    status: "success",
    data: {
      carId,
      startDate,
      endDate,
      available: availabilityCheck.available,
      conflictingBookings: availabilityCheck.conflictingBookings,
    },
  });
});

// NEW: Get unavailable dates for a car
exports.getCarUnavailableDates = catchAsync(async (req, res, next) => {
  const { carId } = req.params;
  const { fromDate, toDate } = req.query;

  // Check if car exists
  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError("Car not found", 404));
  }

  const unavailableDates = await CarAvailabilityService.getUnavailableDates(
    carId,
    fromDate ? new Date(fromDate) : undefined,
    toDate ? new Date(toDate) : undefined
  );

  res.status(200).json({
    status: "success",
    results: unavailableDates.length,
    data: {
      carId,
      unavailableDates,
    },
  });
});

exports.setCarId = (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  next();
};

exports.getAllBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find()
    .sort(req.query.sort || "-createdAt") // Default sort by newest first
    .populate({
      path: "car",
      select: "-__v",
    })
    .populate({
      path: "user",
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

exports.getAllBookingsForUser = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id });
  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

exports.getBooking = factory.getOne(Booking);

// UPDATED: Create booking with availability check
exports.createBooking = catchAsync(async (req, res, next) => {
  const { startDate, endDate, car: carId } = req.body;

  // Validate dates
  const dateValidation = CarAvailabilityService.validateBookingDates(
    startDate,
    endDate
  );
  if (!dateValidation.valid) {
    return next(new AppError(dateValidation.message, 400));
  }

  // Check if car exists and is active
  const car = await Car.findById(carId);
  console.log(req.body);
  if (!car) {
    return next(new AppError("Car not found", 404));
  }

  if (car.status !== "active") {
    return next(new AppError("This car is not available for booking", 400));
  }

  // Check car availability
  const availabilityCheck = await CarAvailabilityService.checkCarAvailability(
    carId,
    startDate,
    endDate
  );

  if (!availabilityCheck.available) {
    const conflictDetails = availabilityCheck.conflictingBookings
      .map(
        (booking) =>
          `${booking.startDate.toDateString()} to ${booking.endDate.toDateString()} (${
            booking.status
          })`
      )
      .join(", ");

    return next(
      new AppError(
        `Car is not available for the selected dates. Conflicting bookings: ${conflictDetails}`,
        409
      )
    );
  }

  // Create the booking
  const doc = await Booking.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

// UPDATED: Update booking with availability check
exports.updateBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { startDate, endDate, car: carId } = req.body;

  // Get existing booking
  const existingBooking = await Booking.findById(id);
  if (!existingBooking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // If dates or car are being updated, check availability
  if (startDate || endDate || carId) {
    const newStartDate = startDate || existingBooking.startDate;
    const newEndDate = endDate || existingBooking.endDate;
    const newCarId = carId || existingBooking.car;

    // Validate dates
    const dateValidation = CarAvailabilityService.validateBookingDates(
      newStartDate,
      newEndDate
    );
    if (!dateValidation.valid) {
      return next(new AppError(dateValidation.message, 400));
    }

    // Check availability (excluding current booking)
    const availabilityCheck = await CarAvailabilityService.checkCarAvailability(
      newCarId,
      newStartDate,
      newEndDate,
      id // Exclude current booking from check
    );

    if (!availabilityCheck.available) {
      const conflictDetails = availabilityCheck.conflictingBookings
        .map(
          (booking) =>
            `${booking.startDate.toDateString()} to ${booking.endDate.toDateString()} (${
              booking.status
            })`
        )
        .join(", ");

      return next(
        new AppError(
          `Car is not available for the selected dates. Conflicting bookings: ${conflictDetails}`,
          409
        )
      );
    }
  }

  // Update the booking
  const doc = await Booking.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

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

// NEW: Approve booking with conflict check
exports.approveBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Get the booking
  const booking = await Booking.findById(id);
  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Check for conflicts with other approved bookings
  const conflictCheck = await CarAvailabilityService.checkApprovalConflicts(
    booking.car,
    booking.startDate,
    booking.endDate,
    booking._id
  );

  if (conflictCheck.hasConflicts) {
    const conflictDetails = conflictCheck.conflictingBookings
      .map(
        (booking) =>
          `${booking.startDate.toDateString()} to ${booking.endDate.toDateString()} (${
            booking.status
          })`
      )
      .join(", ");

    return next(
      new AppError(
        `Cannot approve booking. Car is already booked for these dates: ${conflictDetails}`,
        409
      )
    );
  }

  // Update the booking status to approved
  booking.status = "approved";
  await booking.save();

  res.status(200).json({
    status: "success",
    data: {
      booking,
    },
  });
});

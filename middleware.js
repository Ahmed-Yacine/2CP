const CarAvailabilityService = require("./Utils/CarAvailability");
const Car = require("./models/CarModel");
const AppError = require("./Utils/AppError");
const catchAsync = require("./Utils/CatchAsync");

/**
 * Middleware to check car availability before creating or updating bookings
 * Can be used as alternative to the built-in checks in the controller
 */
exports.checkCarAvailabilityMiddleware = catchAsync(async (req, res, next) => {
  const { car: carId, startDate, endDate } = req.body;
  const bookingId = req.params.id; // For updates

  // Skip if no date information provided
  if (!startDate || !endDate || !carId) {
    return next();
  }

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
  if (!car) {
    return next(new AppError("Car not found", 404));
  }

  if (car.status !== "active") {
    return next(new AppError("This car is not available for booking", 400));
  }

  // Check availability (exclude current booking for updates)
  const availabilityCheck = await CarAvailabilityService.checkCarAvailability(
    carId,
    startDate,
    endDate,
    bookingId // Will be undefined for new bookings
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

  // Store availability check result in request for potential use
  req.availabilityCheck = availabilityCheck;
  next();
});

/**
 * Middleware to validate booking dates only
 */
exports.validateBookingDates = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return next();
  }

  const dateValidation = CarAvailabilityService.validateBookingDates(
    startDate,
    endDate
  );
  if (!dateValidation.valid) {
    return next(new AppError(dateValidation.message, 400));
  }

  next();
});

/**
 * Middleware to check if car is active and exists
 */
exports.validateCar = catchAsync(async (req, res, next) => {
  const carId = req.body.car || req.params.carId;

  if (!carId) {
    return next();
  }

  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError("Car not found", 404));
  }

  if (car.status !== "active") {
    return next(new AppError("This car is not available for booking", 400));
  }

  // Store car in request for potential use
  req.car = car;
  next();
});

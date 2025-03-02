const Booking = require("../models/bookingModel");
const factory = require("./HandlerFactory");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");
const User = require("./../models/UserModel");
const Car = require("./../models/CarModel");

exports.setCarUserIds = factory.setCarUserIds;
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

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

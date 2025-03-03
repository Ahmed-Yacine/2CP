const Booking = require("../models/bookingModel");
const factory = require("./HandlerFactory");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");

exports.setCarUserIds = factory.setCarUserIds;
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

exports.getBookingsStats = catchAsync(async (req, res) => {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

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
    data: stats[0],
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

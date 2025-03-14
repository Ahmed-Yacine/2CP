const Booking = require("../models/bookingModel");
const factory = require("./HandlerFactory");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");
const multer = require("multer");
const sharp = require("sharp");

// TODO: Implement the functionality to upload the receipt photo. :)DONE
// TODO: Rewrite the functionality of calculate the total income and check if the user has paid or not. :)DONE

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadReceiptPhoto = upload.single('receiptPhoto');

exports.resizeReceipt = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.body.receiptPhoto = `receiptPhoto-${req.user.id}-${Date.now()}.webp`;
  await sharp(req.file.buffer)
    .resize(2000, 1333)
    .toFormat("webp")
    .webp({ quality: 90 })
    .toFile(`public/img/receiptPhotos/${req.body.receiptPhoto}`);

  next();
});

exports.setCarUserIds = (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

exports.getBookingsStats = catchAsync(async (req, res) => {
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

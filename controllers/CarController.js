const Car = require("../models/CarModel");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");
const factory = require("./HandlerFactory");
const multer = require("multer");
const sharp = require("sharp");

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

exports.uploadCarPhotos = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

exports.resizeCarPhotos = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  // Process cover image
  if (req.files.imageCover) {
    req.body.imageCover = `car-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}-cover.png`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("png")
      .png({ quality: 90 })
      .toFile(`public/img/cars/${req.body.imageCover}`);
  }

  // Process other images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `car-${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}-${i + 1}.png`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat("png")
          .png({ quality: 90 })
          .toFile(`public/img/cars/${filename}`);
        req.body.images.push(filename);
      })
    );
  }

  next();
});

exports.getAllCars = factory.getAll(Car);
exports.getCar = factory.getOne(Car, { path: "reviews" });
exports.createCar = factory.createOne(Car);
exports.updateCar = factory.updateOne(Car);
exports.deleteCar = factory.deleteOne(Car);

exports.getCarStats = catchAsync(async (req, res) => {
  const stats = await Car.aggregate([
    {
      $facet: {
        totalCars: [{ $count: "total" }],
        activeCars: [{ $match: { status: "active" } }, { $count: "total" }],
      },
    },
    {
      $project: {
        totalCars: { $arrayElemAt: ["$totalCars.total", 0] },
        activeCars: { $arrayElemAt: ["$activeCars.total", 0] },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: stats[0],
  });
});

exports.aliasTopCars = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,dailyRate,monthlyRate";
  req.query.fields = "model,name,ratingsAverage,dailyRate,monthlyRate";
  next();
};

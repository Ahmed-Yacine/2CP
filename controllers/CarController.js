const Car = require("../models/CarModel");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");
const factory = require("./HandlerFactory");
const cloudinary = require("../Utils/Cloudinary");
const upload = require("../Utils/multer");

exports.uploadCarPhotos = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

exports.resizeCarPhotos = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover && !req.files.images) return next();

  // Process cover image
  if (req.files.imageCover) {
    const result = await cloudinary.uploader.upload(
      req.files.imageCover[0].path,
      {
        folder: "cars",
        transformation: [{ width: 1200, height: 800, crop: "fill" }],
      }
    );
    req.body.imageCover = result.secure_url;
  }

  // Process other images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "cars",
          transformation: [{ width: 1200, height: 800, crop: "fill" }],
        });
        req.body.images.push(result.secure_url);
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
  req.query.fields =
    "model,name,ratingsAverage,dailyRate,monthlyRate,imageCover,passengers,transmission,airConditioning";
  next();
};

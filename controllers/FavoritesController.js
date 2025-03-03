const Favorite = require("../models/favoriteCarModel");
const catchasync = require("../Utils/CatchAsync");
const AppError = require("../Utils/AppError");
const factory = require("./HandlerFactory");
const User = require("../models/UserModel");

exports.getFavoriteCarsForCurrentUser = catchasync(async (req, res, next) => {
  const favorites = await Favorite.find({ userId: req.user.id });
  res.status(200).json({
    status: "success",
    results: favorites.length,
    data: {
      favorites,
    },
  });
});

exports.addFavoriteCarToCurrentUser = catchasync(async (req, res, next) => {
  const favorite = await Favorite.create(req.body);
  await User.findByIdAndUpdate(req.user.id, {
    $push: { favoriteCars: favorite._id },
  });
  res.status(201).json({
    status: "success",
    data: {
      favorite,
    },
  });
});

exports.removeFavoriteCarFromCurrentUser = catchasync(async (req, res, next) => {
    const favorite = await Favorite.findOneAndDelete({
        userId: req.user.id,
        carId: req.params.carId,
    });
    if (!favorite) {
        return next(new AppError("No favorite found with that ID", 404));
    }
    res.status(204).json({
        status: "success",
        data: null,
    });
});

exports.setIds = (req, res, next) => {
  req.body.userId = req.user.id;
  req.body.carId = req.params.carId;
  next();
};

const Favorite = require("../models/favoriteCarModel");
const catchasync = require("../Utils/CatchAsync");
const AppError = require("../Utils/AppError");
const factory = require("./HandlerFactory");

exports.getFavoriteCarsForCurrentUser = factory.getAll(Favorite);
exports.addFavoriteCarToCurrentUser = factory.createOne(Favorite);
exports.removeFavoriteCarFromCurrentUser = factory.deleteOne(Favorite);
exports.setIds = factory.setCarUserIds;
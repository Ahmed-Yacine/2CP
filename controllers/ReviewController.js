const Review = require("../models/reviewModel");
const factory = require("./HandlerFactory");

exports.setCarUserIds = factory.setCarUserIds;
exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.getReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

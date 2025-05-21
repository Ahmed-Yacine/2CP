const User = require("../models/UserModel");
const catchAsync = require("./../Utils/CatchAsync");
const AppError = require("./../Utils/AppError");
const factory = require("./HandlerFactory");
const cloudinary = require("../Utils/Cloudinary");
const upload = require("../Utils/multer");

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // 1) Upload image to Cloudinary
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "users",
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto" },
    ],
  });
  // 2) Save the image to the user document
  req.body.photo = result.secure_url;

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User); // Don't update passwords with this! Use updatePassword instead

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "username", "email");
  if (req.file) filteredBody.photo = req.body.photo;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: "success",
    data: null,
  }); // 204 means no content
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /signup instead",
  });
};

exports.checkEmailExists = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Please provide an email address",
    });
  }

  const user = await User.findOne({ email });

  res.status(200).json({
    status: "success",
    exists: !!user,
  });
});

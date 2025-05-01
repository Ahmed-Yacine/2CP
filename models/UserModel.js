const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name"],
  },
  username: {
    type: String,
    required: [true, "Please tell us your username"],
    unique: true,
  },
  wilaya: {
    type: Number,
    required: [true, "Please provide your wilaya"],
    min: 1,
    max: 58,
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  photo: {
    type: String,
    default:
      "https://res.cloudinary.com/dj62xbjdj/image/upload/v1744405654/users/cmyxe78ik9z4ydga4yfj.jpg",
  },
  driverLicense: {
    type: [String],
    validate: {
      validator: function (value) {
        if (this.role === "admin") return true;
        if (value.length === 0) {
          return false;
        } else if (value.length !== 2) {
          return false;
        }
        return true;
      },
      message: function (props) {
        if (this.role === "admin") return "";
        if (props.value.length === 0) {
          return "Please provide your driver license";
        } else if (props.value.length !== 2) {
          return "Please provide the driver license with both faces";
        }
      },
    },
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  dateOfBirth: {
    type: Date,
    required: [true, "Please provide your date of birth"],
    validate: {
      validator: function (value) {
        const today = new Date();
        const birthDate = new Date(value);

        if (isNaN(birthDate)) return false; // Invalid date format

        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();

        // Adjust age if the birthday hasn't happened yet this year
        const exactAge =
          monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0) ? age : age - 1;

        return exactAge >= 18 && birthDate <= today;
      },
      message:
        "User must be at least 18 years old and birth date must be valid.",
    },
  },
  gender: {
    type: String,
    enum: ["male", "female", "not_specified"],
    required: false,
    default: "not_specified",
  },
  phoneNumber: {
    type: String,
    required: [true, "Please provide your phone number"],
    unique: true,
    validate: {
      validator: function (v) {
        return /^0[567]\d{8}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },
  favoriteCars: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
    },
  ],
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false, // password will not be shown in any output
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.methods.createHash = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Document Middleware: runs before .save() and .create() for encrypte password

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // encrypt the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPaswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

const User = mongoose.model("User", userSchema);
module.exports = User;

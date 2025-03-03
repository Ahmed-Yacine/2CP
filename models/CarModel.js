const mongoose = require("mongoose");

const validateAlgerianRegistrationNumber = (value) => {
  // Regex for current format (spaces instead of hyphens)
  const regex = /^\d{5,6}\s\d{3}\s\d{2}$/;

  if (!regex.test(value)) {
    throw new Error("Invalid format");
  }

  // Additional checks for wilaya code and vehicle category
  const [serial, middle, wilaya] = value.split(" ");

  // Validate wilaya code (01-58)
  const wilayaCode = parseInt(wilaya);
  if (wilayaCode < 1 || wilayaCode > 58) {
    throw new Error("Wilaya code must be between 01 and 58");
  }

  // Validate vehicle category (1-9)
  const vehicleCategory = parseInt(middle.charAt(0));
  if (vehicleCategory < 1 || vehicleCategory > 9) {
    throw new Error("Vehicle category must be 1-9");
  }

  return true;
};

const carSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: [true, "Please specify the car model"],
    },
    name: {
      type: String,
      required: [true, "Please specify the car name"],
    },
    exteriorColor: {
      type: String,
      required: [true, "Please specify the exterior color"],
    },
    interiorColor: {
      type: String,
      required: [true, "Please specify the interior color"],
    },
    registrationNumber: {
      type: String,
      required: [true, "Please specify the registration number"],
      unique: true,
      validate: {
        validator: validateAlgerianRegistrationNumber,
        message: "Invalid registration number Format",
      },
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "gas"],
      required: [true, "Please specify the fuel type"],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    transmission: {
      type: String,
      enum: ["manual", "automatic"],
      required: [true, "Please specify the transmission type"],
    },
    passengers: {
      type: Number,
      required: [true, "Please specify the number of passengers"],
    },
    numberOFDoors: {
      type: Number,
      required: [true, "Please specify the number of doors"],
    },
    airConditioning: {
      type: Boolean,
      required: [true, "Please specify if the car has air conditioning"],
    },
    reverseCamera: {
      type: Boolean,
      required: [true, "Please specify if the car has a reverse camera"],
    },
    imageCover: {
      type: String,
      required: [false, "Please provide a cover photo of the car"],
    },
    images: {
      type: [String],
      required: [true, "Please provide photos of the car"],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    dailyRate: {
      type: Number,
      required: [true, "Please specify the daily rate"],
    },
    monthlyRate: {
      type: Number,
      required: [true, "Please specify the monthly rate"],
    },
    description: {
      type: String,
      required: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// stiil need to add indexes for the following fields : price
carSchema.index({ ratingsAverage: -1 });
carSchema.index({ name: 1 });

// virtual populate
carSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "car",
  localField: "_id",
});

const Car = mongoose.model("Car", carSchema);

module.exports = Car;

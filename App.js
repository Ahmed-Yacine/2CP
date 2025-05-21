const express = require("express");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");

// Erors handling Functions
const globalErrorHandler = require("./controllers/ErrorController");
const AppError = require("./Utils/AppError");

const userRouter = require("./routes/UserRoutes");
const carRouter = require("./routes/CarRoutes");
const reviewRouter = require("./routes/ReviewRoutes");
const bookingRouter = require("./routes/BookingRoutes");
const favoriteRouter = require("./routes/FavoritesCarRoutes");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Set security http headers
app.use(helmet());

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Developement Logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data santitization against NoSQL query injection
app.use(mongoSanitize());

// Data santitization against XSS
app.use(xss());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3)_ROUTES
app.use("/api/v1/users", userRouter);
app.use("/api/v1/cars", carRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/favorites", favoriteRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

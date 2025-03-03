const express = require("express");
const bookingController = require("../controllers/BookingController");
const authController = require("../controllers/AuthController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route("/booking-stats")
  .get(authController.restrictTo("admin"), bookingController.getBookingsStats);

router
  .route("/")
  .get(authController.restrictTo("admin"), bookingController.getAllBookings)
  .post(bookingController.setCarUserIds, bookingController.createBooking);

router
  .route("/cancel/:id")
  .patch(
    authController.restrictTo("user"),
    bookingController.cancelBookingForCurrentUser
  );

router.use(authController.restrictTo("admin"));
router
  .route("/:id")
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;

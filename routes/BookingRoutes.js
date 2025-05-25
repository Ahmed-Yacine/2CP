const express = require("express");
const bookingController = require("../controllers/BookingController");
const authController = require("../controllers/AuthController");

const router = express.Router({ mergeParams: true });

// Protect all routes after this middleware
router.use(authController.protect);

// NEW AVAILABILITY ROUTES
// Check if a car is available for specific dates
router.get(
  "/check-availability/:carId",
  bookingController.checkCarAvailability
);

// Get all unavailable dates for a car
router.get(
  "/unavailable-dates/:carId",
  bookingController.getCarUnavailableDates
);

// EXISTING ROUTES (Updated with availability checking)
router.route("/").get(bookingController.getAllBookings).post(
  bookingController.setCarUserIds,
  bookingController.createBooking // Now includes availability check
);

router.get("/my-bookings", bookingController.getAllBookingsForUser);

router.get(
  "/monthly-stats",
  authController.restrictTo("admin"),
  bookingController.getMonthlyBookingsStats
);

router.get(
  "/yearly-stats",
  authController.restrictTo("admin"),
  bookingController.getYearlyBookingsStats
);

router.get(
  "/cars-tracking",
  authController.restrictTo("admin"),
  bookingController.getAllCarsForTracking
);

router.get(
  "/cancelled-bookings",
  authController.restrictTo("admin"),
  bookingController.DetectCancelledBookings
);

router
  .route("/:id")
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking) // Now includes availability check
  .delete(authController.restrictTo("admin"), bookingController.deleteBooking);

router.patch("/cancel/:id", bookingController.cancelBookingForCurrentUser);

// NEW: Route for approving bookings (admin only)
router.patch(
  "/approve/:id",
  authController.restrictTo("admin"),
  bookingController.approveBooking
);

module.exports = router;

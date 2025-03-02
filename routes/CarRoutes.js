const express = require("express");
const carController = require("../controllers/CarController");
const reviewRouter = require("./ReviewRoutes");
const authController = require("../controllers/AuthController");
const bookingRouter = require("./BookingRoutes");
const favoriteRouter = require("./FavoritesCarRoutes");
const router = express.Router();

router.use("/:carId/reviews", reviewRouter);
router.use("/:carId/bookings", bookingRouter);
router.use("/:carId/favorites", favoriteRouter);

router
  .route("/top-5-cheap")
  .get(carController.aliasTopCars, carController.getAllCars);

router
  .route("/")
  .get(carController.getAllCars)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    carController.uploadCarPhotos,
    carController.resizeCarPhotos,
    carController.createCar
  );


router
  .route("/:id")
  .get(carController.getCar)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carController.updateCar
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    carController.deleteCar
  );

module.exports = router;

const express = require("express");
const favoritesController = require("../controllers/FavoritesController");
const authController = require("../controllers/AuthController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route("/")
  .get(favoritesController.getFavoriteCarsForCurrentUser)
  .post(
    favoritesController.setIds,
    favoritesController.addFavoriteCarToCurrentUser
  );
router
  .route("/:id")
  .delete(favoritesController.removeFavoriteCarFromCurrentUser);

module.exports = router;

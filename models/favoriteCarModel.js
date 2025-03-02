const mongoose = require('mongoose');

const favoriteCarSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const FavoriteCar = mongoose.model('FavoriteCar', favoriteCarSchema);

module.exports = FavoriteCar;
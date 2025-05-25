// Utils/CarAvailability.js
const Booking = require("../models/bookingModel");

class CarAvailabilityService {
  /**
   * Check if a car is available for booking in the given date range
   * @param {string} carId - The car ID to check
   * @param {Date} startDate - The desired start date
   * @param {Date} endDate - The desired end date
   * @param {string} excludeBookingId - Optional: exclude a specific booking (for updates)
   * @returns {Promise<Object>} - { available: boolean, conflictingBookings: [] }
   */
  static async checkCarAvailability(
    carId,
    startDate,
    endDate,
    excludeBookingId = null
  ) {
    try {
      // Normalize dates to remove time component for comparison
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);

      requestStart.setHours(0, 0, 0, 0);
      requestEnd.setHours(23, 59, 59, 999);

      // Build query to find conflicting bookings
      const query = {
        car: carId,
        status: { $in: ["approved", "ongoing"] }, // Only check active bookings
        $or: [
          // Case 1: Existing booking starts during requested period
          {
            startDate: { $gte: requestStart, $lte: requestEnd },
          },
          // Case 2: Existing booking ends during requested period
          {
            endDate: { $gte: requestStart, $lte: requestEnd },
          },
          // Case 3: Existing booking completely encompasses requested period
          {
            startDate: { $lte: requestStart },
            endDate: { $gte: requestEnd },
          },
          // Case 4: Requested period completely encompasses existing booking
          {
            startDate: { $gte: requestStart },
            endDate: { $lte: requestEnd },
          },
        ],
      };

      // Exclude specific booking if provided (useful for updates)
      if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
      }

      const conflictingBookings = await Booking.find(query)
        .populate("user", "name email")
        .select("startDate endDate status user");

      return {
        available: conflictingBookings.length === 0,
        conflictingBookings: conflictingBookings,
      };
    } catch (error) {
      console.error("Error checking car availability:", error);
      throw new Error("Failed to check car availability");
    }
  }

  /**
   * Get all unavailable date ranges for a specific car
   * @param {string} carId - The car ID
   * @param {Date} fromDate - Start date to check from (optional)
   * @param {Date} toDate - End date to check until (optional)
   * @returns {Promise<Array>} - Array of unavailable date ranges
   */
  static async getUnavailableDates(
    carId,
    fromDate = new Date(),
    toDate = null
  ) {
    try {
      // Default to check for the next 365 days if no end date provided
      if (!toDate) {
        toDate = new Date();
        toDate.setFullYear(toDate.getFullYear() + 1);
      }

      const bookings = await Booking.find({
        car: carId,
        status: { $in: ["approved", "ongoing"] },
        $or: [
          { startDate: { $gte: fromDate, $lte: toDate } },
          { endDate: { $gte: fromDate, $lte: toDate } },
          {
            startDate: { $lte: fromDate },
            endDate: { $gte: toDate },
          },
        ],
      }).select("startDate endDate status");

      return bookings.map((booking) => ({
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
      }));
    } catch (error) {
      console.error("Error getting unavailable dates:", error);
      throw new Error("Failed to get unavailable dates");
    }
  }

  /**
   * Validate booking dates
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Object} - { valid: boolean, message: string }
   */
  static validateBookingDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      return {
        valid: false,
        message: "Start date must be before end date",
      };
    }

    if (start < today) {
      return {
        valid: false,
        message: "Start date must be today or in the future",
      };
    }

    // Check if dates are too far in the future (optional business rule)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);

    if (start > maxFutureDate) {
      return {
        valid: false,
        message: "Booking cannot be made more than 1 year in advance",
      };
    }

    return {
      valid: true,
      message: "Dates are valid",
    };
  }

  /**
   * Check for conflicts when approving a booking
   * @param {string} carId - The car ID
   * @param {Date} startDate - The start date
   * @param {Date} endDate - The end date
   * @param {string} bookingId - The ID of the booking being approved
   * @returns {Promise<Object>} - { hasConflicts: boolean, conflictingBookings: [] }
   */
  static async checkApprovalConflicts(carId, startDate, endDate, bookingId) {
    try {
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);

      requestStart.setHours(0, 0, 0, 0);
      requestEnd.setHours(23, 59, 59, 999);

      const query = {
        car: carId,
        _id: { $ne: bookingId }, // Exclude the current booking
        status: { $in: ["approved", "ongoing"] }, // Only check approved and ongoing bookings
        $or: [
          // Case 1: Existing booking starts during requested period
          {
            startDate: { $gte: requestStart, $lte: requestEnd },
          },
          // Case 2: Existing booking ends during requested period
          {
            endDate: { $gte: requestStart, $lte: requestEnd },
          },
          // Case 3: Existing booking completely encompasses requested period
          {
            startDate: { $lte: requestStart },
            endDate: { $gte: requestEnd },
          },
          // Case 4: Requested period completely encompasses existing booking
          {
            startDate: { $gte: requestStart },
            endDate: { $lte: requestEnd },
          },
        ],
      };

      const conflictingBookings = await Booking.find(query)
        .populate("user", "name email")
        .select("startDate endDate status user");

      return {
        hasConflicts: conflictingBookings.length > 0,
        conflictingBookings: conflictingBookings,
      };
    } catch (error) {
      console.error("Error checking approval conflicts:", error);
      throw new Error("Failed to check approval conflicts");
    }
  }
}

module.exports = CarAvailabilityService;

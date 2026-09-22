const mongoose = require("mongoose");

const emergencyProfileSchema = new mongoose.Schema({
    riderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    riderCode: {
        type: String,
        required: true,
        unique: true
    },

    bloodGroup: {
        type: String,
        required: true
    },

    emergencyContactName: {
        type: String,
        required: true
    },

    emergencyContactPhone: {
        type: String,
        required: true
    },

    bikeModel: {
        type: String,
        required: true
    },

    bikeNumber: {
        type: String,
        required: true
    },

    emergencyNote: {
        type: String,
        default: ""
    }
});

const EmergencyProfile = mongoose.model(
    "EmergencyProfile",
    emergencyProfileSchema
);

module.exports = EmergencyProfile;
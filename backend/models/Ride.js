const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({

    rideName: {
        type: String,
        required: true
    },

    startLocation: {
        type: String,
        required: true
    },

    destination: {
        type: String,
        required: true
    },

    rideDate: {
        type: String,
        required: true
    },

    rideTime: {
        type: String,
        required: true
    },

    maxRiders: {
        type: Number,
        required: true
    },

    rideDescription: {
        type: String
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    rideCode: {
        type: String,
        required: true,
        unique: true
    },

    status: {
    type: String,
    enum: ["upcoming", "live", "completed"],
    default: "upcoming"
    },
    
    startedAt: {
    type: Date,
    default: null
    },

    sosAlerts: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        latitude: Number,
        longitude: Number,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    riderLocations: [{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    latitude: Number,
    longitude: Number,
    updatedAt: {
        type: Date,
        default: Date.now
        }
    }],

    joinedRiders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]

});

const Ride = mongoose.model("Ride", rideSchema);

module.exports = Ride;
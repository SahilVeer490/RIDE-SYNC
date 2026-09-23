require("dotenv").config({ path: "./backend/.env" });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/user");
const bcrypt = require("bcryptjs");
const Ride = require("./models/Ride");
const EmergencyProfile = require("./models/EmergencyProfile");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("frontend"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/../frontend/index.html");
});

function generateRiderCode() {
    return "RS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get("/", (req, res) => {
    res.send("RIDE SYNC Backend is running!");
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error.message);
    });

const PORT = process.env.PORT || 5000;

app.get("/api/weather", async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
        );

        const data = await response.json();

        res.status(200).json({
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weather_code
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to fetch weather.",
            error: error.message
        });
    }
});

app.get("/api/fuel-stations", async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        const radius = 5000;

        const query = `
            [out:json];
            (
                node["amenity"="fuel"](around:${radius},${latitude},${longitude});
                way["amenity"="fuel"](around:${radius},${latitude},${longitude});
                relation["amenity"="fuel"](around:${radius},${latitude},${longitude});
            );
            out center;
        `;

        const response = await fetch(
            "https://overpass.kumi.systems/api/interpreter",
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                    "User-Agent": "RideSync/1.0 (college project)"
                },
                body: query
            }
        );

        const responseText = await response.text();

        console.log("FUEL API STATUS:", response.status);
        console.log("FUEL API RESPONSE:", responseText);

        let data;

        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return res.status(500).json({
                message: "Fuel API returned an invalid response.",
                error: responseText
            });
        }

        res.status(200).json({
            stations: data.elements || []
        });

    } catch (error) {
        console.log("FUEL ERROR:", error);

        res.status(500).json({
            message: "Unable to fetch fuel stations.",
            error: error.message
        });
    }
});

app.get("/api/service-centers", async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        const radius = 5000;

        const query = `
            [out:json];
            (
                node["shop"="motorcycle"](around:${radius},${latitude},${longitude});
                way["shop"="motorcycle"](around:${radius},${latitude},${longitude});
                node["shop"="car_repair"](around:${radius},${latitude},${longitude});
                way["shop"="car_repair"](around:${radius},${latitude},${longitude});
            );
            out center;
        `;

        const response = await fetch(
            "https://overpass.kumi.systems/api/interpreter",
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                    "User-Agent": "RideSync/1.0 (college project)"
                },
                body: query
            }
        );

        const responseText = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({
                message: "Service center API error.",
                error: responseText
            });
        }

        const data = JSON.parse(responseText);

        res.status(200).json({
            centers: data.elements || []
        });

    } catch (error) {
        console.log("SERVICE CENTER ERROR:", error);

        res.status(500).json({
            message: "Unable to fetch service centers.",
            error: error.message
        });
    }
});

app.post("/api/sos", async (req, res) => {
    try {
        const { rideCode, userId, latitude, longitude } = req.body;

        const ride = await Ride.findOne({ rideCode });

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        ride.sosAlerts.push({
            user: userId,
            latitude: latitude,
            longitude: longitude
        });

        await ride.save();

        res.status(200).json({
            message: "SOS alert saved successfully!",
            location: {
                latitude: latitude,
                longitude: longitude
            }
        });

    } catch (error) {
        console.log("SOS ERROR:", error);

        res.status(500).json({
            message: "Unable to save SOS alert.",
            error: error.message
        });
    }
});

app.get("/api/sos-alerts/:rideCode", async (req, res) => {
    try {
        const ride = await Ride.findOne({
            rideCode: req.params.rideCode
        }).populate("sosAlerts.user", "fullName bike");

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        res.status(200).json({
            alerts: ride.sosAlerts
        });

    } catch (error) {
        console.log("SOS ALERT ERROR:", error);

        res.status(500).json({
            message: "Unable to fetch SOS alerts.",
            error: error.message
        });
    }
});

app.post("/api/ai-chat", async (req, res) => {
    try {

        const { message, userId, rideCode } = req.body;

        if (!message) {
            return res.status(400).json({
                message: "Please enter a message."
            });
        }

        let ride = null;
        let rideContext = "No active ride information available.";

        if (rideCode) {
            ride = await Ride.findOne({ rideCode })
                .populate("createdBy", "fullName bike")
                .populate("joinedRiders", "fullName bike");
        }

        if (ride) {
            rideContext = `
Current Ride Information:

Ride Name: ${ride.rideName}
Start: ${ride.startLocation}
Destination: ${ride.destination}
Date: ${ride.rideDate}
Time: ${ride.rideTime}
Status: ${ride.status}
Ride Code: ${ride.rideCode}
Total Riders: ${ride.joinedRiders.length}
`;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3.6-flash"
        });

        const prompt = `
You are RIDE SYNC AI, a specialized AI assistant for bikers and motorcycle riders.

Your expertise includes:
- Motorcycle riding and touring
- Long-distance rides
- Route and trip planning
- Bike maintenance
- Fuel and mileage
- Riding safety
- Weather-related riding advice
- Touring gear
- Group rides
- Emergency riding situations

Stay focused on motorcycles, riding, travel and rider safety.

If a question is unrelated to riding, politely explain that you specialize in biking and rides.

Give practical, simple and useful answers.

For emergencies, prioritize immediate safety and contacting local emergency services.

Current Ride Context:
${rideContext}

Rider's question:
${message}
`;

        const result = await model.generateContent(prompt);

        const reply = result.response.text();

        res.status(200).json({
            reply: reply
        });

    } catch (error) {

        console.log("GEMINI AI ERROR:", error);

        res.status(500).json({
            message: "Unable to get AI response.",
            error: error.message
        });
    }
});

app.post("/api/signup", async (req, res) => {
    try {
        const { fullName, email, phone, bike, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            fullName,
            email,
            phone,
            bike,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "Account created successfully!"
        });

    } catch (error) {
        res.status(500).json({
            message: "Signup failed",
            error: error.message
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        res.json({
            message: "Login successful!",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                bike: user.bike
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});

app.post("/api/create-ride", async (req, res) => {
    try {

        const {
            rideName,
            startLocation,
            destination,
            rideDate,
            rideTime,
            maxRiders,
            rideDescription,
            createdBy
        } = req.body;

        const rideCode =
            "RS-" +
            Math.random().toString(36).substring(2, 8).toUpperCase();

        const newRide = new Ride({
            rideName,
            startLocation,
            destination,
            rideDate,
            rideTime,
            maxRiders,
            rideDescription,
            createdBy,
            rideCode,
            joinedRiders: [createdBy]
        });

        await newRide.save();

        res.status(201).json({
            message: "Ride created successfully!",
            ride: newRide
        });

    } catch (error) {

        res.status(500).json({
            message: "Ride creation failed",
            error: error.message
        });

    }
});

app.post("/api/join-ride", async (req, res) => {
    try {

        const { rideCode, userId } = req.body;

        const ride = await Ride.findOne({ rideCode });

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found. Check the ride code."
            });
        }

        if (ride.joinedRiders.includes(userId)) {
            return res.status(200).json({
                message: "You are already in this ride.",
                alreadyJoined: true,
                ride: ride
            });
        }

        if (ride.joinedRiders.length >= ride.maxRiders) {
            return res.status(400).json({
                message: "This ride is full."
            });
        }

        ride.joinedRiders.push(userId);

        await ride.save();

        res.status(200).json({
            message: "Ride joined successfully!",
            ride: ride
        });

    } catch (error) {

        res.status(500).json({
            message: "Unable to join ride.",
            error: error.message
        });

    }
});

app.post("/api/update-location", async (req, res) => {

    try {

        const {
            rideCode,
            userId,
            latitude,
            longitude
        } = req.body;

        const ride = await Ride.findOne({ rideCode });

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        const existingRider = ride.riderLocations.find(
            (rider) => rider.user.toString() === userId
        );

        if (existingRider) {

            existingRider.latitude = latitude;
            existingRider.longitude = longitude;
            existingRider.updatedAt = new Date();

        } else {

            ride.riderLocations.push({
                user: userId,
                latitude,
                longitude
            });

        }

        await ride.save();

        res.status(200).json({
            message: "Location updated successfully!"
        });

    } catch (error) {

        res.status(500).json({
            message: "Unable to update location.",
            error: error.message
        });

    }
});

app.get("/api/ride-crew/:rideCode", async (req, res) => {
    try {
        const ride = await Ride.findOne({
            rideCode: req.params.rideCode
        })
        .populate("createdBy", "fullName bike")
        .populate("joinedRiders", "fullName bike");

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        const riders = [...ride.joinedRiders];

        const creatorAlreadyIncluded = riders.some(
            (rider) =>
                rider._id.toString() === ride.createdBy._id.toString()
        );

        if (!creatorAlreadyIncluded) {
            riders.unshift(ride.createdBy);
        }

        res.status(200).json({
            riders: riders
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to fetch ride crew.",
            error: error.message
        });
    }
});

app.get("/api/ride-locations/:rideCode", async (req, res) => {

    try {

        const ride = await Ride.findOne({
            rideCode: req.params.rideCode
        }).populate(
            "riderLocations.user",
            "fullName bike"
        );

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        res.status(200).json({
            riderLocations: ride.riderLocations
        });

    } catch (error) {

        res.status(500).json({
            message: "Unable to fetch rider locations.",
            error: error.message
        });

    }
});

// Start Ride
app.patch("/api/start-ride/:rideId", async (req, res) => {
    try {
        const { rideId } = req.params;
        const { userId } = req.body;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        if (ride.createdBy.toString() !== userId) {
            return res.status(403).json({
                message: "Only the ride creator can start this ride."
            });
        }

        if (ride.status !== "upcoming") {
            return res.status(400).json({
                message: "This ride cannot be started."
            });
        }

        ride.status = "live";
        ride.startedAt = new Date();

        await ride.save();

        res.status(200).json({
            message: "Ride started successfully!",
            ride: ride
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to start ride.",
            error: error.message
        });
    }
});

// End Ride
app.patch("/api/end-ride/:rideId", async (req, res) => {
    try {
        const { rideId } = req.params;
        const { userId } = req.body;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        if (ride.createdBy.toString() !== userId) {
            return res.status(403).json({
                message: "Only the ride creator can end this ride."
            });
        }

        if (ride.status !== "live") {
            return res.status(400).json({
                message: "This ride is not currently live."
            });
        }

        ride.status = "completed";

        await ride.save();

        res.status(200).json({
            message: "Ride ended successfully!",
            ride: ride
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to end ride.",
            error: error.message
        });
    }
});

app.patch("/api/update-ride/:rideId", async (req, res) => {
    try {
        const { rideId } = req.params;

        const {
            userId,
            rideName,
            startLocation,
            destination,
            rideDate,
            rideTime,
            maxRiders,
            rideDescription
        } = req.body;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        if (ride.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the ride creator can update this ride."
            });
        }

        if (ride.status === "completed") {
            return res.status(400).json({
                message: "Completed rides cannot be updated."
            });
        }

        ride.rideName = rideName;
        ride.startLocation = startLocation;
        ride.destination = destination;
        ride.rideDate = rideDate;
        ride.rideTime = rideTime;
        ride.maxRiders = maxRiders;
        ride.rideDescription = rideDescription;

        await ride.save();

        res.status(200).json({
            message: "Ride updated successfully!",
            ride: ride
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to update ride.",
            error: error.message
        });
    }
});

app.delete("/api/delete-ride/:rideId", async (req, res) => {
    try {
        const { rideId } = req.params;
        const { userId } = req.body;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found."
            });
        }

        if (ride.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the ride creator can delete this ride."
            });
        }

        if (ride.status === "live") {
            return res.status(400).json({
                message: "Live rides cannot be deleted. End the ride first."
            });
        }

        await Ride.findByIdAndDelete(rideId);

        res.status(200).json({
            message: "Ride deleted successfully!"
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to delete ride.",
            error: error.message
        });
    }
});

app.get("/api/old-rides/:userId", async (req, res) => {
    try {

        const userId = req.params.userId;

        const rides = await Ride.find({
            $or: [
                { createdBy: userId },
                { joinedRiders: userId }
            ]
        }).sort({ rideDate: -1 });

        res.status(200).json({
            rides: rides
        });

    } catch (error) {

        res.status(500).json({
            message: "Unable to fetch old rides.",
            error: error.message
        });

    }
});

app.get("/api/live-rides/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const rides = await Ride.find({
            status: "live",
            $or: [
                { createdBy: userId },
                { joinedRiders: userId }
            ]
        }).sort({ rideDate: 1 });

        res.status(200).json({
            rides: rides
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to fetch live rides.",
            error: error.message
        });
    }
});

app.get("/api/upcoming-rides/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const rides = await Ride.find({
            status: "upcoming",
            $or: [
                { createdBy: userId },
                { joinedRiders: userId }
            ]
        }).sort({ rideDate: 1, rideTime: 1 });

        res.status(200).json({
            rides: rides
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to fetch upcoming rides.",
            error: error.message
        });
    }
});

app.post("/api/emergency-profile", async (req, res) => {
    try {
        const {
            riderId,
            bloodGroup,
            emergencyContactName,
            emergencyContactPhone,
            bikeModel,
            bikeNumber,
            emergencyNote
        } = req.body;

        if (
            !riderId ||
            !bloodGroup ||
            !emergencyContactName ||
            !emergencyContactPhone ||
            !bikeModel ||
            !bikeNumber
        ) {
            return res.status(400).json({
                message: "Please fill all required emergency details."
            });
        }

        const existingProfile = await EmergencyProfile.findOne({ riderId });

        if (existingProfile) {
            return res.status(400).json({
                message: "Emergency profile already exists."
            });
        }

        const riderCode = generateRiderCode();

        const profile = new EmergencyProfile({
            riderId,
            riderCode,
            bloodGroup,
            emergencyContactName,
            emergencyContactPhone,
            bikeModel,
            bikeNumber,
            emergencyNote: emergencyNote || ""
        });

        await profile.save();

        res.status(201).json({
            message: "Emergency profile created successfully!",
            profile: profile
        });

    } catch (error) {
        console.log("EMERGENCY PROFILE ERROR:", error);

        res.status(500).json({
            message: "Unable to create emergency profile.",
            error: error.message
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`RIDE SYNC Backend is running on port ${PORT}`);
});
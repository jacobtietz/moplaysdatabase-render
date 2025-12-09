// routes/userRoutes.js
import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import multer from "multer";

const router = express.Router();

// ---------------- Middleware to verify JWT ----------------
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ---------------- GET all users (Admin only) ----------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password"); // exclude passwords
    res.status(200).json({ users });
  } catch (err) {
    console.error("Fetch all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET current logged-in user ----------------
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET public user by ID ----------------
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- Multer setup for profile picture ----------------
const storage = multer.memoryStorage(); // store in memory to convert to base64
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Only PNG or JPEG images are allowed."));
    }
  },
});

// ---------------- PUT update current user ----------------
router.put("/profile", authMiddleware, upload.single("profilePicture"), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      firstName,
      lastName,
      phone,
      account,
      contact,
      schoolName,
      description,
      biography,
      companyName,
      street,
      stateCity,
      country,
      website,
    } = req.body;

    // --- Validation ---
    if (firstName && firstName.length > 20) return res.status(400).json({ message: "First name too long" });
    if (lastName && lastName.length > 20) return res.status(400).json({ message: "Last name too long" });
    if (description && description.length > 450) return res.status(400).json({ message: "Description too long" });
    if (biography && biography.length > 2000) return res.status(400).json({ message: "Biography too long" });
    if (schoolName && schoolName.length > 100) return res.status(400).json({ message: "School name too long" });
    if (companyName && companyName.length > 100) return res.status(400).json({ message: "Company name too long" });
    if (street && street.length > 100) return res.status(400).json({ message: "Street too long" });
    if (stateCity && stateCity.length > 100) return res.status(400).json({ message: "State & City too long" });
    if (country && country.length > 50) return res.status(400).json({ message: "Country too long" });
    if (account && ![0,1,2,3,4].includes(Number(account))) return res.status(400).json({ message: "Invalid account type" });
    if (contact && ![0,1].includes(Number(contact))) return res.status(400).json({ message: "Invalid contact value" });

    // --- Update fields ---
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (account !== undefined) user.account = Number(account);
    if (contact !== undefined) user.contact = Number(contact);
    if (schoolName) user.schoolName = schoolName;

    // --- Update profile object ---
    if (!user.profile) user.profile = {};

    if (description) user.profile.description = description;
    if (biography) user.profile.biography = biography;
    if (companyName) user.profile.companyName = companyName;
    if (street) user.profile.street = street;
    if (stateCity) user.profile.stateCity = stateCity;
    if (country) user.profile.country = country;
    if (website) user.profile.website = website;

    // --- Profile picture ---
    if (req.file) {
      const base64Image = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype;
      user.profile.profilePicture = `data:${mimeType};base64,${base64Image}`;
    }

    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

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

// ---------------- PUT update a user's account level (Admin only) ----------------
router.put("/:id/account", authMiddleware, async (req, res) => {
  try {
    const { account } = req.body;

    if (account === undefined || ![0, 1, 2, 3, 4].includes(Number(account))) {
      return res.status(400).json({ message: "Invalid account level" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.account = Number(account);
    await user.save();

    res.status(200).json({ message: "Account level updated", user });
  } catch (err) {
    console.error("Account update error:", err);
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

    const { firstName, lastName, phone, contact, account, schoolName, profile } = req.body;

    // --- Update main user fields ---
    if (firstName) user.firstName = firstName.trim() || " ";
    if (lastName) user.lastName = lastName.trim() || " ";
    if (phone) user.phone = phone.trim() || " ";
    if (contact !== undefined) user.contact = Number(contact);
    if (account !== undefined) user.account = Number(account);
    if (schoolName) user.schoolName = schoolName;

    // --- Handle profile picture ---
    if (req.file) {
      const base64Image = req.file.buffer.toString("base64");
      user.profile = user.profile || {};
      user.profile.profilePicture = `data:${req.file.mimetype};base64,${base64Image}`;
    }

    // --- Parse nested profile object if provided ---
    let profileData = {};
    if (profile) {
      try {
        profileData = typeof profile === "string" ? JSON.parse(profile) : profile;
      } catch {
        profileData = {};
      }
    }

    user.profile = {
      ...user.profile,
      description: profileData.description?.trim() || " ",
      biography: profileData.biography?.trim() || " ",
      companyName: profileData.companyName?.trim() || " ",
      street: profileData.street?.trim() || " ",
      stateCity: profileData.stateCity?.trim() || " ",
      country: profileData.country?.trim() || " ",
      website: profileData.website?.trim() || " ",
      profilePicture: user.profile?.profilePicture || "",
    };

    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

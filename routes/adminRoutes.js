// backend/routes/adminRoutes.js
import express from "express";
import User from "../models/User.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------------
// GET all users (admin only)
// ------------------------
router.get("/users", protect, allowRoles(4), async (req, res) => {
  try {
    // Fetch all users, excluding passwords
    const users = await User.find().select("-password");

    // Example: you can access the current admin's account level
    // console.log("Admin account level:", req.user.account);

    res.status(200).json({ users });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// --------------------------------------
// PUT update account level of a specific user (admin only)
// --------------------------------------
router.put("/users/:id/account", protect, allowRoles(4), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { account } = req.body;

    // Validate account level
    if (![0, 1, 2, 3, 4].includes(account)) {
      return res.status(400).json({ message: "Invalid account level" });
    }

    // Update the user's account level
    user.account = account;
    await user.save();

    res.status(200).json({
      message: "Account updated successfully",
      user, // user.account now reflects the updated level
    });
  } catch (err) {
    console.error("Failed to update account:", err);
    res.status(500).json({ message: "Failed to update account" });
  }
});

export default router;

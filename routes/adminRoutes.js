// routes/adminRoutes.js
import express from "express";
import User from "../models/User.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---------------- GET all users (admin only) ----------------
router.get("/users", protect, allowRoles(4), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ users });
  } catch (err) {
    console.error("Fetch all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- UPDATE a user's account level ----------------
router.put("/users/:id/account", protect, allowRoles(4), async (req, res) => {
  try {
    const { account } = req.body;
    if (![0, 1, 3, 4].includes(Number(account))) {
      return res.status(400).json({ message: "Invalid account type" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.account = Number(account);
    await user.save();

    res.status(200).json({ message: "Account updated", user });
  } catch (err) {
    console.error("Update account error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- DELETE a user ----------------
router.delete("/users/:id", protect, allowRoles(4), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

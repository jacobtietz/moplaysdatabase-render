import User from "../models/userModel.js";

// GET current logged-in user's profile (protected)
export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(404).json({ message: "User not found" });
    res.json({ user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET any user's profile by ID (public)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

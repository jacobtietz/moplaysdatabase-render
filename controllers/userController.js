import User from "../models/User.js";
import fs from "fs";

// -------------------- GET current logged-in user's profile (protected) --------------------
export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(404).json({ message: "User not found" });
    res.json({ user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------- GET any user's profile by ID (public) --------------------
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

// -------------------- UPDATE current logged-in user's profile (protected) --------------------
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { firstName, lastName, phone, contact, profile } = req.body;

    // Update main user fields
    user.firstName = firstName?.trim() || " ";
    user.lastName = lastName?.trim() || " ";
    user.phone = phone?.trim() || " ";
    if (contact !== undefined) user.contact = contact;

    // Handle profilePicture upload (from FormData)
    if (req.files?.profilePicture?.[0]) {
      const file = req.files.profilePicture[0];
      const fileData = fs.readFileSync(file.path);
      user.profile.profilePicture = `data:${file.mimetype};base64,${fileData.toString("base64")}`;
      fs.unlinkSync(file.path);
    }

    // Parse profile object if sent as JSON string
    let profileData = {};
    if (profile) {
      if (typeof profile === "string") {
        try {
          profileData = JSON.parse(profile);
        } catch (err) {
          console.warn("Failed to parse profile JSON, using empty object.");
        }
      } else {
        profileData = profile;
      }
    }

    // Update only provided profile fields, default to space if blank
    user.profile = {
      ...user.profile.toObject(),
      description: profileData.description?.trim() || " ",
      biography: profileData.biography?.trim() || " ",
      companyName: profileData.companyName?.trim() || " ",
      street: profileData.street?.trim() || " ",
      stateCity: profileData.stateCity?.trim() || " ",
      country: profileData.country?.trim() || " ",
      website: profileData.website?.trim() || " ",
      profilePicture: user.profile.profilePicture || user.profile.profilePicture || "", // retain existing if not updated
    };

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

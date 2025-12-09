import User from "../models/User.js";

// -------------------- GET current logged-in user's profile (protected) --------------------
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
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

    // --- Parse profile JSON if provided ---
    let profileData = {};
    if (profile) {
      try {
        profileData = typeof profile === "string" ? JSON.parse(profile) : profile;
      } catch {
        profileData = {};
      }
    }

    // --- Merge profile fields ---
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
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

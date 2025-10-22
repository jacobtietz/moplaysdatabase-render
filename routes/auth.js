// routes/auth.js
import express from "express";
import User from "../models/User.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ------------------ SIGNUP ------------------
router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, phone, password, account, contact, schoolName } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      account,
      contact,
      schoolName,
    });

    if (account === 1) {
      newUser.profile = {
        profilePicture: "",
        description: "",
        biography: "",
        companyName: "",
        street: "",
        stateCity: "",
        country: "",
        website: "",
      };
    }

    await newUser.save();

    res.status(201).json({ message: "Account created successfully", userId: newUser._id });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, account: user.account }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        account: user.account,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ------------------ CHECK LOGIN STATUS ------------------
const verifyToken = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "User not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

router.get("/profile", verifyToken);
router.get("/check", verifyToken);

// ------------------ LOGOUT ------------------
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

// ------------------ FORGOT PASSWORD ------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(200).json({ message: "If an account exists, a reset link has been sent." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      text: `Click here to reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    res.status(200).json({ message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot-password error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ------------------ RESET PASSWORD ------------------
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // Assign password directly; pre-save hook in User.js hashes it
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Optional: auto-login like Login.js
    const jwtToken = jwt.sign({ id: user._id, account: user.account }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Password reset successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        account: user.account,
      },
    });
  } catch (err) {
    console.error("Reset-password error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

export default router;

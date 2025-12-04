// backend/controllers/contactController.js
import User from "../models/User.js";
import { sendContactEmail } from "../utils/Email.js";

/**
 * Send message to a specific user.
 * Only logged-in users can send (sender info taken from req.user).
 */
export const contactUser = async (req, res) => {
  try {
    const sender = req.user; // logged-in user
    const targetUserId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Use the sendContactEmail utility
    await sendContactEmail({
      firstName: sender.firstName,
      lastName: sender.lastName,
      emailAddress: sender.email,
      mobileNo: sender.phone,
      message: message,
      to: targetUser.email, // optional if sendContactEmail supports sending to other recipients
    });

    return res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending contact message:", err);
    return res.status(500).json({ message: "Server error. Could not send message." });
  }
};

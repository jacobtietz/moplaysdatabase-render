// backend/controllers/contactController.js
import User from "../models/User.js";
import { sendEmail } from "../utils/Email.js";

/**
 * Send a message from the logged-in user to a target user
 */
export const contactUser = async (req, res) => {
  try {
    const sender = req.user; // logged-in user
    const targetUserId = req.params.id; // user to contact
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Construct the email content
    const emailSubject = `Message from ${sender.firstName} ${sender.lastName} via MPDB`;
    const emailBody = `
You have received a message via MPDB from a registered user:

Name: ${sender.firstName} ${sender.lastName}
Email: ${sender.email}
Phone: ${sender.phone || "N/A"}

Message:
${message}
    `;

    // Send email to the target user's email
    await sendEmail({
      to: targetUser.email,
      subject: emailSubject,
      text: emailBody,
    });

    return res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending contact message:", err);
    return res.status(500).json({ message: "Server error. Could not send message." });
  }
};

// backend/controllers/contactController.js
import User from "../models/User.js";
import { sendEmail } from "../utils/Email.js";

/**
 * Send a message from the logged-in user to a target user
 * Rate-limited per target user to prevent spam
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

    // ---------------- RATE LIMIT CHECK ----------------
    const COOLDOWN_MS = 60 * 60 * 1000; // 5 minutes
    const now = Date.now();

    // Ensure sender.messagesSent exists
    sender.messagesSent = sender.messagesSent || [];

    // Filter messages sent to this target
    const lastMessage = sender.messagesSent
      .filter(msg => msg.to.toString() === targetUserId)
      .sort((a, b) => b.sentAt - a.sentAt)[0];

    if (lastMessage && now - new Date(lastMessage.sentAt).getTime() < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (now - new Date(lastMessage.sentAt).getTime())) / 1000);
      return res.status(429).json({ message: `You must wait ${waitSeconds} seconds before sending another message to this user.` });
    }

    // ---------------- SEND EMAIL ----------------
    const emailSubject = `Message from ${sender.firstName} ${sender.lastName} via MPDB`;
    const emailBody = `
You have received a message via MPDB from a registered user:

Name: ${sender.firstName} ${sender.lastName}
Email: ${sender.email}
Phone: ${sender.phone || "N/A"}

Message:
${message}
    `;

    await sendEmail({
      to: targetUser.email,
      subject: emailSubject,
      text: emailBody,
    });

    // ---------------- UPDATE SENDER RECORD ----------------
    sender.messagesSent.push({ to: targetUser._id, sentAt: new Date() });
    await sender.save();

    return res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending contact message:", err);
    return res.status(500).json({ message: "Server error. Could not send message." });
  }
};

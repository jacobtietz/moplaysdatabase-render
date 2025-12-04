// backend/routes/contactRoutes.js
import express from "express";
import sendEmail from "../utils/sendEmail.js"; // should use Gmail API internally

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, emailAddress, mobileNo, message } = req.body;

    if (!firstName || !lastName || !emailAddress || !message) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    // Compose email text
    const emailText = `
Name: ${firstName} ${lastName}
Email: ${emailAddress}
Phone: ${mobileNo || "N/A"}

Message:
${message}
    `;

    // Send email using Gmail API
    await sendEmail({
      from: "MPDB Support <moplaysdatabase@gmail.com>", // must match Gmail account
      to: "moplaysdatabase@gmail.com",
      subject: `Contact Form Submission from ${firstName} ${lastName}`,
      text: emailText,
    });

    res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Contact form send error:", err);
    res.status(500).json({ message: "Failed to send message." });
  }
});

export default router;

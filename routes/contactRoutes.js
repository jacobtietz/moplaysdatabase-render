// routes/contactRoutes.js
import express from "express";
import { sendContactEmail } from "../utils/Email.js";

const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
  const { firstName, lastName, emailAddress, mobileNo, message } = req.body;

  if (!firstName || !lastName || !emailAddress || !message) {
    return res.status(400).json({ message: "Please fill all required fields." });
  }

  try {
    await sendContactEmail({ firstName, lastName, emailAddress, mobileNo, message });
    console.log(`✅ Contact email sent from ${firstName} ${lastName}`);
    res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ message: err.message || "Failed to send message." });
  }
});

export default router;

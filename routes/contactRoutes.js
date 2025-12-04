// routes/contactRoutes.js
import express from "express";
import { sendContactEmail } from "../utils/Email.js";
import { protect } from "../middleware/authMiddleware.js"; // make sure path matches your project
import { contactUser } from "../controllers/contactController.js"; // we'll create this

const router = express.Router();

// -----------------------
// Public Contact Form
// POST /api/contact
// -----------------------
router.post("/", async (req, res) => {
  try {
    const contactData = req.body; // { firstName, lastName, emailAddress, mobileNo, message }
    await sendContactEmail(contactData);
    res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// -----------------------
// Contact a Specific User (Protected)
// POST /api/contact/user/:id
// -----------------------
router.post("/user/:id", protect, contactUser);

export default router;

// routes/contactRoutes.js
import express from "express";
import { sendContactEmail } from "../utils/Email.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    await sendContactEmail(req.body);
    res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;

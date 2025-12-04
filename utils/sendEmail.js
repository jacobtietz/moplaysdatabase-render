import { Resend } from "resend";
import express from "express";

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------- SEND EMAIL ----------------------
const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Resend API key is not set in environment variables.");
  }

  try {
    await resend.emails.send({
      from: "MPDB Support <no-reply@moplays.resend.dev>", // use your verified address
      to,
      subject,
      text,
      html,
    });

    console.log(`✅ Email sent to ${to} successfully.`);
  } catch (err) {
    console.error("Resend error:", err);
    throw err;
  }
};

// ---------------------- RECEIVE EMAIL ----------------------
// Create a router to handle incoming webhook events from Resend
const emailWebhookRouter = express.Router();

emailWebhookRouter.post("/", async (req, res) => {
  const event = req.body;

  if (event.type === "email.received") {
    console.log("📩 Received email event:", event);

    // Example: handle anonymous contact or save email to DB
    // const { from, to, subject, body } = event;
    // await saveEmailToDB({ from, to, subject, body });

    return res.json({ status: "received", event });
  }

  res.json({ status: "ignored" });
});

export default sendEmail;
export { emailWebhookRouter };

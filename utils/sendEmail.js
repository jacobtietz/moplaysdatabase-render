// utils/sendEmail.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SendGrid API key not set in environment variables.");
  }

  const msg = {
    to,
    from: {
      email: "moplaysdatabase@gmail.com", // same verified sender
      name: "MPDB Support",
    },
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to} via SendGrid`);
  } catch (err) {
    console.error("❌ SendGrid email error:", err);
    throw err;
  }
};

export default sendEmail;

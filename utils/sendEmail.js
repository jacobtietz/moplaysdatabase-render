import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Resend API key is not set in environment variables.");
  }

  try {
    await resend.emails.send({
      from: "MPDB Support <no-reply@moplays.resend.dev>", // change to your verified domain
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

export default sendEmail;

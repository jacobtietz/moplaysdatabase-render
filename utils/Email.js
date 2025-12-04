// src/utils/Email.js
import { google } from "googleapis";

// ---------------------- GMAIL SETUP ----------------------
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// ---------------------- HELPER TO CREATE RAW MESSAGE ----------------------
function makeRawMessage({ from, to, subject, text, html }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    html ? "Content-Type: text/html; charset=UTF-8" : "Content-Type: text/plain; charset=UTF-8",
    "",
    html || text,
  ].join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------- SEND EMAIL ----------------------
export const sendEmail = async ({ to, subject, text, html, from }) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Gmail API credentials are not set in environment variables.");
  }

  try {
    const raw = makeRawMessage({
      from: from || "MPDB Support <moplaysdatabase@gmail.com>",
      to,
      subject,
      text,
      html,
    });

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log(`✅ Email sent to ${to} successfully.`);
  } catch (err) {
    console.error("Gmail API error:", err);
    throw err;
  }
};

// ---------------------- SEND CONTACT EMAIL ----------------------
export const sendContactEmail = async ({ firstName, lastName, emailAddress, mobileNo, message }) => {
  if (!firstName || !lastName || !emailAddress || !message) {
    throw new Error("All required fields must be filled.");
  }

  const emailText = `
Name: ${firstName} ${lastName}
Email: ${emailAddress}
Phone: ${mobileNo || "N/A"}

Message:
${message}
  `;

  await sendEmail({
    from: "MPDB Support <moplaysdatabase@gmail.com>",
    to: "moplaysdatabase@gmail.com",
    subject: `Contact Form Submission from ${firstName} ${lastName}`,
    text: emailText,
  });

  console.log(`✅ Contact email sent from ${firstName} ${lastName}`);
};

// ---------------------- SEND ACCOUNT EMAIL ----------------------
export const sendAccountEmail = async (user, customMessage = null) => {
  const adminEmail = "moplaysdatabase@gmail.com";

  if (!user?.email) {
    console.error("❌ No user email provided — aborting email send.");
    return;
  }

  const { email, firstName = "", lastName = "", phone = "", account, schoolName = "", contact = "" } = user;

  const accountType =
    account === 0 ? "Educator" :
    account === 1 ? "Playwright" :
    "Unknown";

  const fromAddress = "MO Plays <moplaysdatabase@gmail.com>";

  if (customMessage) {
    const subject = customMessage.startsWith("Reset")
      ? "Password Reset - MO Plays"
      : "MO Plays Notification";

    await sendEmail({ from: fromAddress, to: email, subject, text: customMessage });
    console.log(`✅ Custom email sent to ${email}`);
    return;
  }

  const adminMessage = `
A new MO Plays account has been created.

Email: ${email}
Name: ${firstName} ${lastName}
Phone Number: ${phone}
Account Type: ${accountType}
School: ${schoolName || "N/A"}
Contact: ${contact || "N/A"}

Please review and verify the account.
`;

  const userMessage = `
Hello ${firstName} ${lastName},

Your account has been successfully created on MO Plays! 
Please understand that our verification process may take up to 24 hours. 
We appreciate your patience — thank you!

– The MO Plays Team
`;

  await sendEmail({ from: fromAddress, to: adminEmail, subject: `New MO Plays Account Created: ${firstName} ${lastName}`, text: adminMessage });
  await sendEmail({ from: fromAddress, to: email, subject: "Welcome to MO Plays!", text: userMessage });

  console.log(`✅ Emails sent to admin and ${email}`);
};

// ---------------------- EXPORTS ----------------------
export default { sendEmail, sendContactEmail, sendAccountEmail };

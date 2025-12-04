import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground"; // or your redirect URI
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

function makeRawMessage({ from, to, subject, text }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "",
    text,
  ].join("\n");

  // Gmail API requires base64url encoding
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendEmail({ from, to, subject, text }) {
  const raw = makeRawMessage({ from, to, subject, text });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

async function sendAccountEmail(user, customMessage = null) {
  const adminEmail = "moplaysdatabase@gmail.com";

  if (!user?.email) {
    console.error("❌ No user email provided — aborting email send.");
    return;
  }

  const {
    email,
    firstName = "",
    lastName = "",
    phone = "",
    account,
    schoolName = "",
    contact = "",
  } = user;

  const accountType =
    account === 0 ? "Educator" :
    account === 1 ? "Playwright" :
    "Unknown";

  const fromAddress = "MO Plays <yourgmail@gmail.com>"; // must match Gmail account

  // Custom messages (like password reset)
  if (customMessage) {
    const subject = customMessage.startsWith("Reset")
      ? "Password Reset - MO Plays"
      : "MO Plays Notification";

    await sendEmail({ from: fromAddress, to: email, subject, text: customMessage });
    console.log(`✅ Custom email sent to ${email}`);
    return;
  }

  // Standard account creation messages
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

  // Send admin email
  await sendEmail({
    from: fromAddress,
    to: adminEmail,
    subject: `New MO Plays Account Created: ${firstName} ${lastName}`,
    text: adminMessage,
  });

  // Send user email
  await sendEmail({
    from: fromAddress,
    to: email,
    subject: "Welcome to MO Plays!",
    text: userMessage,
  });

  console.log(`✅ Emails sent to admin and ${email}`);
}

export default sendAccountEmail;

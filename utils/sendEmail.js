import { google } from "googleapis";

// ---------------------- GMAIL SETUP ----------------------
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

// ---------------------- HELPER TO CREATE RAW MESSAGE ----------------------
function makeRawMessage({ from, to, subject, text, html }) {
  let message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    html ? `Content-Type: text/html; charset=UTF-8` : "Content-Type: text/plain; charset=UTF-8",
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
const sendEmail = async ({ to, subject, text, html }) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Gmail API credentials are not set in environment variables.");
  }

  try {
    const raw = makeRawMessage({
      from: "MPDB Support <moplaysdatabase@gmail.com>", // must match Gmail account
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

export default sendEmail;
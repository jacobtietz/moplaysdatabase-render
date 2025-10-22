// utils/Email.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

  try {
    // If this is a custom message (like password reset)
    if (customMessage) {
      const subject = customMessage.startsWith("Reset")
        ? "Password Reset - MO Plays"
        : "MO Plays Notification";

      const msg = {
        to: email,
        from: {
          email: "moplaysdatabase@gmail.com",
          name: "MO Plays",
        },
        subject,
        text: customMessage,
      };

      await sgMail.send(msg);
      console.log(`✅ Custom email sent to ${email}`);
      return;
    }

    // Otherwise, handle standard account creation
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
    await sgMail.send({
      to: adminEmail,
      from: {
        email: "moplaysdatabase@gmail.com",
        name: "MO Plays",
      },
      subject: `New MO Plays Account Created: ${firstName} ${lastName}`,
      text: adminMessage,
    });

    // Send user email
    await sgMail.send({
      to: email,
      from: {
        email: "moplaysdatabase@gmail.com",
        name: "MO Plays",
      },
      subject: "Welcome to MO Plays!",
      text: userMessage,
    });

    console.log(`✅ Emails sent to admin and ${email}`);
  } catch (err) {
    console.error("❌ Failed to send SendGrid email:", err);
  }
}

export default sendAccountEmail;

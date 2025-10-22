import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text, html }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials are not set in environment variables.');
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: `"MPDB Support" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        console.log(`Email sent to ${to} successfully.`);
    } catch (err) {
        console.error('Nodemailer error:', err);
        throw err;
    }
};

export default sendEmail;

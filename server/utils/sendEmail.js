const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer.
 * Requires EMAIL_USER and EMAIL_PASS environment variables (for an SMTP service).
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
const sendEmail = async (options) => {
    // 1. Create a transporter object using the default SMTP transport
    // This example uses a secure connection (TLS/SSL)
    console.log('process.env.EMAIL_HOST',process.env.EMAIL_HOST)
    console.log('process.env.EMAIL_PORT',process.env.EMAIL_PORT)
    console.log('process.env.EMAIL_HOST',process.env.EMAIL_USER)
    console.log('process.env.EMAIL_HOST',process.env.EMAIL_PASS)


    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.mailtrap.io', // Use a real host like smtp.sendgrid.net or smtp.gmail.com
        port: process.env.EMAIL_PORT || 2525, // Port for your host
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // Your SMTP username
            pass: process.env.EMAIL_PASS, // Your SMTP password
        },
        // IMPORTANT: For development, this helps with self-signed certificates
        tls: {
            rejectUnauthorized: false
        }
    });

    // 2. Define the email details
    const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'Pocket POS Support'} <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    // 3. Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);

    // If you are using a provider like SendGrid or Mailgun, you'd check their specific response structure.
    return info;
};

module.exports = sendEmail;

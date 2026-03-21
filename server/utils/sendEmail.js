const nodemailer = require('nodemailer');

/**
 * Sends email via Nodemailer (real SMTP — Gmail, SendGrid, SES, Resend, etc.).
 *
 * Required .env:
 *   EMAIL_HOST   — e.g. smtp.gmail.com, smtp.sendgrid.net
 *   EMAIL_PORT   — e.g. 587 (STARTTLS) or 465 (SSL)
 *   EMAIL_USER   — SMTP username (Gmail address, or "apikey" for SendGrid)
 *   EMAIL_PASS   — App password / API key / SMTP password
 *
 * Optional:
 *   EMAIL_SECURE              — "true" for SSL on port 465 (auto-true if port is 465)
 *   EMAIL_FROM                — Sender address (e.g. hello@pocketpos.io or "Name <hello@pocketpos.io>")
 *   EMAIL_FROM_NAME           — Display name if EMAIL_FROM is only an email (default: Pocket POS)
 *   EMAIL_REQUIRE_TLS         — "true" to force STARTTLS on port 587
 *   EMAIL_TLS_REJECT_UNAUTHORIZED — set "false" only for broken dev certs (not recommended in prod)
 *
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} [options.text]
 * @param {string} [options.html]
 */
const sendEmail = async (options) => {
    const host = process.env.EMAIL_HOST?.trim();
    if (!host) {
        throw new Error(
            'EMAIL_HOST is not set. Add SMTP settings to your .env to send real email. See server/.env.example'
        );
    }

    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const secure =
        process.env.EMAIL_SECURE === 'true' ||
        process.env.EMAIL_SECURE === '1' ||
        port === 465;

    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS;
    if (!user || pass == null || pass === '') {
        throw new Error('EMAIL_USER and EMAIL_PASS are required for SMTP.');
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        ...(process.env.EMAIL_REQUIRE_TLS === 'true' ? { requireTLS: true } : {}),
        tls: {
            rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
        },
    });

    const fromName = process.env.EMAIL_FROM_NAME || 'Pocket POS';
    let from;
    if (process.env.EMAIL_FROM?.trim()) {
        const raw = process.env.EMAIL_FROM.trim();
        from = raw.includes('<') ? raw : `${fromName} <${raw}>`;
    } else {
        from = `${fromName} <${user}>`;
    }

    const mailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    if (process.env.NODE_ENV !== 'production') {
        console.log('[sendEmail] SMTP:', { host, port, secure, from: from.replace(/<[^>]+>/, '<…>') });
    }

    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
        console.log('[sendEmail] sent, messageId:', info.messageId);
    }
    return info;
};

module.exports = sendEmail;

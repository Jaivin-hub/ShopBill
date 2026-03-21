const nodemailer = require('nodemailer');

/**
 * Plain-text fallback for HTML-only bodies (improves deliverability / spam scoring).
 */
function htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);
}

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
 *   EMAIL_DEBUG               — "1" to log full Nodemailer SMTP traffic (very verbose)
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
        const err = new Error(
            'EMAIL_HOST is not set. Add SMTP settings to your .env to send real email. See server/.env.example'
        );
        console.error('[sendEmail] CONFIG ERROR:', err.message);
        throw err;
    }

    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const secure =
        process.env.EMAIL_SECURE === 'true' ||
        process.env.EMAIL_SECURE === '1' ||
        port === 465;

    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS;
    if (!user || pass == null || pass === '') {
        const err = new Error('EMAIL_USER and EMAIL_PASS are required for SMTP.');
        console.error('[sendEmail] CONFIG ERROR:', err.message);
        throw err;
    }

    const connMs = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT_MS || '15000', 10);
    const greetMs = parseInt(process.env.EMAIL_GREETING_TIMEOUT_MS || '10000', 10);
    const sockMs = parseInt(process.env.EMAIL_SOCKET_TIMEOUT_MS || '25000', 10);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: connMs,
        greetingTimeout: greetMs,
        socketTimeout: sockMs,
        debug: process.env.EMAIL_DEBUG === '1',
        logger: process.env.EMAIL_DEBUG === '1',
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

    const textBody = options.text || (options.html ? htmlToPlainText(options.html) : undefined);

    const mailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        text: textBody,
        html: options.html,
    };

    // Always log send attempts (no secrets) — production was silent before, hiding SMTP failures.
    console.log('[sendEmail] attempt', {
        host,
        port,
        secure,
        to: options.to,
        subject: options.subject,
        fromPreview: from.replace(/<[^>]*>/, '<addr>'),
        hasText: !!textBody,
    });

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[sendEmail] success', {
            messageId: info.messageId,
            to: options.to,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
        });
        return info;
    } catch (err) {
        console.error('[sendEmail] FAILED', {
            message: err.message,
            code: err.code,
            command: err.command,
            responseCode: err.responseCode,
            response: err.response,
            to: options.to,
        });
        throw err;
    }
};

module.exports = sendEmail;

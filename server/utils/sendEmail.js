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
 * Console output (always):
 *   [sendEmail] ========== START ==========
 *   [sendEmail] config check / transporter ready / calling sendMail...
 *   [sendEmail] ========== RESULT: SENT OK ==========   OR   RESULT: NOT SENT (ERROR)
 *
 * Required .env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
 * Optional: EMAIL_SECURE, EMAIL_FROM, EMAIL_FROM_NAME, EMAIL_REQUIRE_TLS,
 *           EMAIL_TLS_REJECT_UNAUTHORIZED, EMAIL_DEBUG=1 (verbose SMTP)
 */
const sendEmail = async (options) => {
    const ts = () => new Date().toISOString();

    console.log('[sendEmail] ========== START ==========', ts());
    console.log('[sendEmail] to:', options?.to, '| subject:', options?.subject || '(no subject)');

    const host = process.env.EMAIL_HOST?.trim();
    if (!host) {
        const err = new Error(
            'EMAIL_HOST is not set. Add SMTP settings to your .env to send real email. See server/.env.example'
        );
        console.error('[sendEmail] ========== RESULT: NOT SENT (CONFIG) ==========', err.message);
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
        console.error('[sendEmail] ========== RESULT: NOT SENT (CONFIG) ==========', err.message);
        throw err;
    }

    console.log('[sendEmail] SMTP target:', { host, port, secure, user: user.replace(/(.{2}).*(@.*)/, '$1***$2') });

    const connMs = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT_MS || '15000', 10);
    const greetMs = parseInt(process.env.EMAIL_GREETING_TIMEOUT_MS || '10000', 10);
    const sockMs = parseInt(process.env.EMAIL_SOCKET_TIMEOUT_MS || '25000', 10);

    const emailDebug = process.env.EMAIL_DEBUG === '1';

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: connMs,
        greetingTimeout: greetMs,
        socketTimeout: sockMs,
        debug: emailDebug,
        ...(emailDebug ? { logger: console } : {}),
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

    console.log('[sendEmail] mail envelope:', {
        from: from.replace(/<[^>]+>/, '<hidden@domain>'),
        to: options.to,
        hasHtml: !!options.html,
        hasText: !!textBody,
    });
    console.log('[sendEmail] calling transporter.sendMail() ...', ts());

    try {
        const info = await transporter.sendMail(mailOptions);

        console.log('[sendEmail] ========== RESULT: SENT OK ==========', ts());
        console.log('[sendEmail] messageId:', info.messageId);
        console.log('[sendEmail] accepted:', info.accepted, '| rejected:', info.rejected);
        console.log('[sendEmail] smtp response:', info.response);

        return info;
    } catch (err) {
        console.error('[sendEmail] ========== RESULT: NOT SENT (ERROR) ==========', ts());
        console.error('[sendEmail] error.message:', err.message);
        console.error('[sendEmail] error.code:', err.code);
        console.error('[sendEmail] error.command:', err.command);
        console.error('[sendEmail] error.responseCode:', err.responseCode);
        console.error('[sendEmail] error.response:', err.response);
        if (err.stack) console.error('[sendEmail] stack:\n', err.stack);

        throw err;
    }
};

module.exports = sendEmail;

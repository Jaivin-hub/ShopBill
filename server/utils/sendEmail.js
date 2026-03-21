/**
 * Nodemailer SMTP helper.
 * Do NOT remove or silence console.log / console.error / console.warn in this file — owners rely on logs
 * to debug missing mail (SMTP auth, firewall, wrong CLIENT_URL, etc.).
 */
const nodemailer = require('nodemailer');

/** Always log (do not remove) — used to debug “mail not sending” in production logs / PM2. */
function maskEmailUser(u) {
    if (!u || typeof u !== 'string') return '(unset)';
    const at = u.indexOf('@');
    if (at <= 0) return `${u.slice(0, 2)}***`;
    return `${u.slice(0, 2)}***${u.slice(at)}`;
}

/**
 * Safe to return in JSON API responses (no passwords). Use when host logs (e.g. Render) are hard to read.
 */
function getSmtpEnvSnapshotForApi() {
    const host = String(process.env.EMAIL_HOST || '').trim();
    const user = String(process.env.EMAIL_USER || '').trim();
    const pass = process.env.EMAIL_PASS;
    const cu = String(process.env.CLIENT_URL || '').trim();
    const ready = !!(host && user && pass != null && String(pass).length > 0);
    let explain =
        'After add-staff, wait a few seconds then GET /api/staff/email-debug (owner) to see if SMTP reported OK or an error.';
    if (!host) explain = 'EMAIL_HOST is missing — server cannot connect to SMTP.';
    else if (!user || pass == null || String(pass).length === 0) {
        explain = 'EMAIL_USER or EMAIL_PASS missing — SMTP auth will fail.';
    } else if (!cu) explain = 'CLIENT_URL missing — email may send but activation links will be wrong.';
    return {
        EMAIL_HOST_configured: !!host,
        EMAIL_HOST_value: host || null,
        EMAIL_PORT: process.env.EMAIL_PORT || '587',
        EMAIL_SECURE: process.env.EMAIL_SECURE ?? null,
        EMAIL_USER_configured: !!user,
        EMAIL_USER_masked: user ? user.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
        EMAIL_PASS_configured: pass != null && String(pass).length > 0,
        EMAIL_FROM_configured: !!(process.env.EMAIL_FROM && String(process.env.EMAIL_FROM).trim()),
        CLIENT_URL_configured: !!cu,
        CLIENT_URL_preview: cu ? (cu.length > 96 ? `${cu.slice(0, 96)}…` : cu) : null,
        readyToAttemptSmtp: ready,
        explain,
    };
}

/** Last async queued send result (updated by queueSendEmail). For GET /api/staff/email-debug. */
let lastQueuedDispatchDebug = null;

function recordQueuedDispatchDebug(payload) {
    lastQueuedDispatchDebug = {
        ...payload,
        recordedAt: new Date().toISOString(),
    };
}

function getLastQueuedDispatchDebug() {
    return lastQueuedDispatchDebug;
}

function logEmailEnvSnapshot(context) {
    const pass = process.env.EMAIL_PASS;
    console.log('[sendEmail] --- ENV snapshot (masked)', context || '', {
        EMAIL_HOST: process.env.EMAIL_HOST || '(unset)',
        EMAIL_PORT: process.env.EMAIL_PORT || '(default 587)',
        EMAIL_SECURE: process.env.EMAIL_SECURE ?? '(unset)',
        EMAIL_USER: maskEmailUser(process.env.EMAIL_USER),
        EMAIL_PASS: pass != null && pass !== '' ? '(set, length ' + String(pass).length + ')' : '(missing)',
        EMAIL_FROM: process.env.EMAIL_FROM || '(unset — will use EMAIL_USER)',
        EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || '(default Pocket POS)',
        CLIENT_URL: process.env.CLIENT_URL || '(unset — activation links may be wrong)',
        EMAIL_DEBUG: process.env.EMAIL_DEBUG === '1' ? '1 (verbose SMTP wire log on)' : '0',
        EMAIL_SEND_TIMEOUT_MS: process.env.EMAIL_SEND_TIMEOUT_MS || '45000 (default)',
    });
}

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
 * Required .env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
 * Optional: EMAIL_SEND_TIMEOUT_MS (default 45000), EMAIL_DEBUG=1
 */
const sendEmail = async (options) => {
    const ts = () => new Date().toISOString();
    const t0 = Date.now();

    console.log('[sendEmail] ========== START ==========', ts());
    logEmailEnvSnapshot('(each send)');
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

    // Gmail SMTP only accepts logins for @gmail.com OR Google Workspace accounts on that domain.
    if (/gmail\.com/i.test(host) && user && !/@gmail\.com$/i.test(user)) {
        console.warn(
            '[sendEmail] ⚠️  GMAIL SMTP + non-@gmail.com EMAIL_USER:',
            user.replace(/(.{2}).*(@.*)/, '$1***$2'),
            '→ This ONLY works if that domain is on Google Workspace. If not, use SendGrid/Resend OR set EMAIL_USER to a @gmail.com address + App Password.'
        );
    }

    // Many hosts block outbound 465; 587 STARTTLS often works — document in log
    if (port === 465) {
        console.warn(
            '[sendEmail] Using port 465. If send hangs or times out, try EMAIL_PORT=587 and EMAIL_SECURE=false (or unset).'
        );
    }

    console.log('[sendEmail] SMTP target:', { host, port, secure, user: user.replace(/(.{2}).*(@.*)/, '$1***$2') });

    const connMs = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT_MS || '20000', 10);
    const greetMs = parseInt(process.env.EMAIL_GREETING_TIMEOUT_MS || '15000', 10);
    const sockMs = parseInt(process.env.EMAIL_SOCKET_TIMEOUT_MS || '30000', 10);
    const overallMs = parseInt(process.env.EMAIL_SEND_TIMEOUT_MS || '45000', 10);

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
    console.log('[sendEmail] nodemailer transporter created', { host, port, secure, connMs, greetMs, sockMs, emailDebug });

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
    console.log('[sendEmail] calling transporter.sendMail() ...', ts(), `(hard timeout ${overallMs}ms)`);

    let settled = false;
    let progressCount = 0;
    const progressTimer = setInterval(() => {
        if (settled) return;
        progressCount += 1;
        console.warn(`[sendEmail] … still waiting on SMTP (${progressCount * 8}s elapsed) — if this never ends, port may be blocked or auth stuck`);
    }, 8000);

    const closeTransport = () => {
        try {
            transporter.close();
        } catch (_) {
            /* ignore */
        }
    };

    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(
                    new Error(
                        `SMTP sendMail() timed out after ${overallMs}ms. Try: EMAIL_PORT=587, EMAIL_SECURE=false; check host firewall allows outbound SMTP; verify Google Workspace if using @domain on smtp.gmail.com.`
                    )
                );
            }, overallMs);
        });

        const info = await Promise.race([transporter.sendMail(mailOptions), timeoutPromise]);

        settled = true;
        clearInterval(progressTimer);
        closeTransport();

        const elapsedMs = Date.now() - t0;
        console.log('[sendEmail] ========== RESULT: SENT OK ==========', ts(), `elapsedMs=${elapsedMs}`);
        console.log('[sendEmail] messageId:', info.messageId);
        console.log('[sendEmail] accepted:', info.accepted, '| rejected:', info.rejected);
        console.log('[sendEmail] smtp response:', info.response);
        try {
            console.log('[sendEmail] sendMail info keys:', info && typeof info === 'object' ? Object.keys(info) : '(n/a)');
        } catch (e) {
            console.log('[sendEmail] sendMail info keys: (could not list)', e.message);
        }
        console.log(
            '[sendEmail] If inbox is empty: check Spam; for Workspace/custom From, verify SPF/DKIM for your domain.'
        );

        return info;
    } catch (err) {
        settled = true;
        clearInterval(progressTimer);
        closeTransport();

        const elapsedMs = Date.now() - t0;
        console.error('[sendEmail] ========== RESULT: NOT SENT (ERROR) ==========', ts(), `elapsedMs=${elapsedMs}`);
        console.error('[sendEmail] error.message:', err.message);
        console.error('[sendEmail] error.code:', err.code);
        console.error('[sendEmail] error.command:', err.command);
        console.error('[sendEmail] error.responseCode:', err.responseCode);
        console.error('[sendEmail] error.response:', err.response);
        if (err.stack) console.error('[sendEmail] stack:\n', err.stack);

        throw err;
    }
};

/**
 * Run send after the current HTTP response finishes (setImmediate) so slow SMTP does not block the client.
 * All queue + result logging stays in this file — routes should only call sendEmail() or queueSendEmail().
 *
 * @param {object} mailOpts — { to, subject, html?, text? }
 * @param {string} [contextLabel] — e.g. activation-new-staff (appears in logs only)
 */
function queueSendEmail(mailOpts, contextLabel = 'queued') {
    const startedAt = new Date().toISOString();
    recordQueuedDispatchDebug({
        phase: 'queued',
        context: contextLabel,
        to: mailOpts?.to,
        subject: mailOpts?.subject || null,
        smtpEnv: getSmtpEnvSnapshotForApi(),
    });
    console.log('[sendEmail] ========== QUEUED (async, non-blocking) ==========', startedAt, `context=${contextLabel}`);
    console.log('[sendEmail] QUEUED detail:', {
        context: contextLabel,
        to: mailOpts?.to,
        subject: mailOpts?.subject || '(none)',
        hasHtml: !!mailOpts?.html,
        hasText: !!mailOpts?.text,
        htmlLength: mailOpts?.html ? String(mailOpts.html).length : 0,
    });
    console.log('[sendEmail] QUEUED env: EMAIL_HOST=', process.env.EMAIL_HOST || '(unset)', '| full SMTP trace follows on send');

    setImmediate(() => {
        const smtpStart = new Date().toISOString();
        console.log('[sendEmail] QUEUED → invoking sendEmail()', smtpStart, `context=${contextLabel}`);
        sendEmail(mailOpts)
            .then((info) => {
                const done = new Date().toISOString();
                recordQueuedDispatchDebug({
                    phase: 'send_ok',
                    context: contextLabel,
                    to: mailOpts.to,
                    messageId: info?.messageId,
                    accepted: info?.accepted,
                    rejected: info?.rejected,
                    smtpResponse: info?.response,
                });
                console.log('[sendEmail] ========== QUEUED SEND OK ==========', done, `context=${contextLabel}`);
                console.log('[sendEmail] QUEUED SEND OK detail:', {
                    to: mailOpts.to,
                    messageId: info?.messageId,
                    accepted: info?.accepted,
                    rejected: info?.rejected,
                    response: info?.response,
                });
            })
            .catch((err) => {
                const failAt = new Date().toISOString();
                recordQueuedDispatchDebug({
                    phase: 'send_failed',
                    context: contextLabel,
                    to: mailOpts.to,
                    errorMessage: err.message,
                    errorCode: err.code,
                    smtpCommand: err.command,
                    smtpResponseCode: err.responseCode,
                    smtpResponse: err.response,
                });
                console.error('[sendEmail] ========== QUEUED SEND FAILED ==========', failAt, `context=${contextLabel}`);
                console.error('[sendEmail] QUEUED SEND FAILED detail:', {
                    to: mailOpts.to,
                    message: err.message,
                    code: err.code,
                    command: err.command,
                    responseCode: err.responseCode,
                    response: err.response,
                });
                if (err.stack) console.error('[sendEmail] QUEUED SEND FAILED stack:', err.stack);
            })
            .finally(() => {
                console.log(
                    '[sendEmail] QUEUED sendMail promise settled (OK or FAIL logged above)',
                    new Date().toISOString(),
                    `context=${contextLabel}`
                );
            });
    });
}

sendEmail.queueSendEmail = queueSendEmail;
sendEmail.getSmtpEnvSnapshotForApi = getSmtpEnvSnapshotForApi;
sendEmail.getLastQueuedDispatchDebug = getLastQueuedDispatchDebug;

module.exports = sendEmail;

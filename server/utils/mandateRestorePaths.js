/** API routes allowed while subscription is halted (mandate restore gate only). */
function isMandateRestoreAllowedPath(req) {
    const raw = req.originalUrl || req.baseUrl + req.path || req.url || '';
    const path = raw.split('?')[0];

    const allowed = [
        /^\/api\/auth\/current-plan\/?$/,
        /^\/api\/auth\/profile\/?$/,
        /^\/api\/payment\/mandate-restore\/me\/?$/,
        /^\/api\/payment\/mandate-restore\/request-me\/?$/,
        /^\/api\/payment\/mandate-restore\/my-checkout\/?$/,
        /^\/api\/payment\/mandate-restore\/verify\/?$/,
        /^\/api\/payment\/mandate-restore\/request\/?$/,
        /^\/api\/payment\/mandate-restore\/checkout\/[^/]+\/?$/,
    ];
    return allowed.some((re) => re.test(path));
}

module.exports = { isMandateRestoreAllowedPath };

/** Premium plan — max active outlets per owner account */
const PREMIUM_MAX_OUTLETS = 5;

function premiumMaxOutlets() {
    return PREMIUM_MAX_OUTLETS;
}

function canCreatePremiumOutlet(activeCount) {
    return Number(activeCount) < PREMIUM_MAX_OUTLETS;
}

function premiumOutletLimitMessage() {
    return `Store limit reached. Premium accounts can have up to ${PREMIUM_MAX_OUTLETS} outlets. Delete an existing outlet to add another.`;
}

module.exports = {
    PREMIUM_MAX_OUTLETS,
    premiumMaxOutlets,
    canCreatePremiumOutlet,
    premiumOutletLimitMessage,
};

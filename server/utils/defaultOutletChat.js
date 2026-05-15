const Chat = require('../models/Chat');

/**
 * Find the auto-created per-outlet group chat (default flag) or the legacy/bootstrap
 * group for that outlet (same outlet + owner-created) so we rename instead of duplicating.
 */
async function findDefaultOutletGroupChat(ownerUserId, outletId) {
    if (!outletId) return null;
    let chat = await Chat.findOne({
        type: 'group',
        isDefault: true,
        outletId,
    });
    if (chat) return chat;
    if (!ownerUserId) return null;
    chat = await Chat.findOne({
        type: 'group',
        outletId,
        createdBy: ownerUserId,
    })
        .sort({ createdAt: 1 })
        .exec();
    return chat || null;
}

/**
 * Keep the default outlet group title in sync with Store.name (e.g. after profile / outlet rename).
 */
async function syncDefaultOutletGroupName(ownerUserId, store) {
    if (!store || !store._id || !store.name) return null;
    const desiredName = `${String(store.name).trim()} Group`;
    const chat = await findDefaultOutletGroupChat(ownerUserId, store._id);
    if (!chat) return null;
    let changed = false;
    if (chat.name !== desiredName) {
        chat.name = desiredName;
        changed = true;
    }
    if (!chat.isDefault) {
        chat.isDefault = true;
        changed = true;
    }
    if (!chat.createdBy && ownerUserId) {
        chat.createdBy = ownerUserId;
        changed = true;
    }
    if (changed) await chat.save();
    return chat;
}

module.exports = {
    findDefaultOutletGroupChat,
    syncDefaultOutletGroupName,
};

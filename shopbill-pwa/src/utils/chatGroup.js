/** Resolve group creator user id from chat document (API may send createdById or populated createdBy). */
export function getChatCreatorId(chat) {
    if (!chat) return null;
    if (chat.createdById) return String(chat.createdById);
    const cb = chat.createdBy;
    if (!cb) return null;
    if (typeof cb === 'object') {
        const id = cb._id ?? cb.id;
        return id != null ? String(id) : null;
    }
    return String(cb);
}

export function isChatGroupCreator(chat, currentUser) {
    const creatorId = getChatCreatorId(chat);
    const uid = currentUser?._id ?? currentUser?.id;
    return Boolean(creatorId && uid && String(creatorId) === String(uid));
}

/** Merge API chat fields so creator checks work after create / message fetch. */
export function normalizeChatRecord(chat) {
    if (!chat || typeof chat !== 'object') return chat;
    const createdById = getChatCreatorId(chat);
    return {
        ...chat,
        ...(createdById ? { createdById } : {}),
    };
}

/** Custom user-created group (not system default outlet group). */
export function isCustomChatGroup(chat) {
    if (!chat) return false;
    const isGroup = chat.type === 'group' || chat.isGroupChat || chat.isDefault;
    return isGroup && !chat.isDefault;
}

import { isStaffViewer } from './ownerDisplay';

/** Short label for the quoted message in a reply bubble or composer. */
export function getReplyPreviewText(replyTo) {
    if (!replyTo) return '';
    const type = replyTo.messageType || 'text';
    if (type === 'audio') {
        const sec = replyTo.audioDuration ? Math.floor(replyTo.audioDuration) : null;
        return sec != null ? `Voice message (${sec}s)` : 'Voice message';
    }
    if (type === 'file') {
        if (replyTo.fileName) return replyTo.fileName;
        if (replyTo.fileType?.startsWith('image/')) return 'Photo';
        return 'File';
    }
    const text = (replyTo.content || '').trim();
    return text.length > 140 ? `${text.slice(0, 140)}…` : text || 'Message';
}

function viewerUserId(currentUser) {
    return String(currentUser?._id || currentUser?.id || '');
}

function replyQuotedUserId(replyTo) {
    const sid = replyTo?.senderId;
    if (!sid) return '';
    if (typeof sid === 'object') return String(sid._id || sid.id || '');
    return String(sid);
}

/** Label above a reply quote — "Me" for your own messages, "Owner" for staff viewing owner, else name. */
export function getReplySenderLabel(replyTo, currentUser) {
    if (!replyTo) return '';

    const viewerId = viewerUserId(currentUser);
    const quotedId = replyQuotedUserId(replyTo);
    if (viewerId && quotedId && viewerId === quotedId) {
        return 'Me';
    }

    const role = String(replyTo.senderRole || '').toLowerCase();
    if (role === 'owner') {
        if (isStaffViewer(currentUser)) return 'Owner';
        return 'Owner';
    }
    return (replyTo.senderName || '').trim() || 'User';
}

export function buildClientReplySnapshot(msg) {
    if (!msg?._id) return null;
    const senderId = msg.senderId?._id || msg.senderId || null;
    return {
        messageId: msg._id,
        senderId,
        senderName: msg.senderName || 'User',
        senderRole: msg.senderRole || '',
        messageType: msg.messageType || 'text',
        content: (msg.content || '').slice(0, 500),
        fileName: msg.fileName || null,
        fileType: msg.fileType || null,
        audioDuration: msg.audioDuration ?? null,
    };
}

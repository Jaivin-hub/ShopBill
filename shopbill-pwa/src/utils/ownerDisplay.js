/**
 * Managers and cashiers should see the store owner only as "Owner" — never name or email.
 */

export function isStaffViewer(currentUser) {
    const r = (currentUser?.role || '').toLowerCase();
    return r === 'manager' || r === 'cashier';
}

export function isParticipantOwner(participantLike) {
    const r = (participantLike?.role || '').toLowerCase();
    return r === 'owner';
}

/** Primary display name for a user/participant row */
export function participantLabelForViewer(participantLike, currentUser) {
    if (!participantLike) return 'Unknown';
    if (isStaffViewer(currentUser) && isParticipantOwner(participantLike)) {
        return 'Owner';
    }
    return participantLike.name || participantLike.email || 'Unknown';
}

/** Email line under name — hidden for owner when viewer is staff */
export function participantEmailForViewer(participantLike, currentUser) {
    if (!participantLike) return null;
    if (isStaffViewer(currentUser) && isParticipantOwner(participantLike)) {
        return null;
    }
    return participantLike.email || null;
}

/** Chat / staff list role badge: show a single label for owner when staff is viewing */
export function participantRoleLabelForViewer(participantLike, currentUser) {
    if (isStaffViewer(currentUser) && isParticipantOwner(participantLike)) {
        return 'Owner';
    }
    return participantLike?.role || 'Personnel';
}

function escapeRx(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getOwnerDisplayNamesFromParticipants(participants) {
    const names = [];
    for (const p of participants || []) {
        if (!isParticipantOwner(p)) continue;
        const n = (p.name || '').trim();
        if (n) names.push(n);
    }
    return [...new Set(names)];
}

/** Replace @OwnerName with @Owner in message text for staff viewers */
export function messageContentForStaffViewer(content, participants, currentUser) {
    if (!content || !isStaffViewer(currentUser)) return content;
    const ownerNames = getOwnerDisplayNamesFromParticipants(participants);
    let out = content;
    for (const n of ownerNames) {
        out = out.replace(new RegExp(`@${escapeRx(n)}(?=\\s|$)`, 'g'), '@Owner');
    }
    return out;
}

/** mentionsDetail with owner names masked for highlighting */
export function mentionsDetailForStaffViewer(mentionsDetail, participants, currentUser) {
    if (!Array.isArray(mentionsDetail) || !isStaffViewer(currentUser)) return mentionsDetail;
    const roleById = new Map(
        (participants || []).map((p) => [String(p._id || p.id || ''), (p.role || '').toLowerCase()])
    );
    return mentionsDetail.map((m) => {
        const id = String(m._id || '');
        if (roleById.get(id) === 'owner') {
            return { ...m, name: 'Owner' };
        }
        return m;
    });
}

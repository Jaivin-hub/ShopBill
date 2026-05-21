import React from 'react';
import { getReplyPreviewText, getReplySenderLabel } from '../../utils/chatReply';

/** Quoted message strip (composer or inside bubble). */
const ReplyQuote = ({ replyTo, currentUser, isOwn, darkMode, compact = false }) => {
    if (!replyTo?.messageId) return null;
    const sender = getReplySenderLabel(replyTo, currentUser);
    const preview = getReplyPreviewText(replyTo);

    return (
        <div
            className={`border-l-[3px] rounded-md mb-2 pl-2.5 pr-2 py-1.5 ${
                isOwn
                    ? 'border-white/70 bg-white/10'
                    : darkMode
                        ? 'border-indigo-400 bg-slate-900/60'
                        : 'border-indigo-500 bg-indigo-50/80'
            } ${compact ? 'mb-1.5 py-1' : ''}`}
        >
            <p
                className={`text-[10px] font-black uppercase tracking-wide truncate ${
                    isOwn ? 'text-white/90' : darkMode ? 'text-indigo-300' : 'text-indigo-600'
                }`}
            >
                {sender}
            </p>
            <p
                className={`text-[11px] font-medium leading-snug line-clamp-2 ${
                    isOwn ? 'text-white/80' : darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
            >
                {preview}
            </p>
        </div>
    );
};

export default ReplyQuote;

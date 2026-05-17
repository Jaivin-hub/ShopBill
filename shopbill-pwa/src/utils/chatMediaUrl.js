/** Resolve chat upload paths (audio/files) to a fetchable URL. */
export function resolveChatMediaUrl(relativeOrAbsolute) {
    if (!relativeOrAbsolute) return null;
    if (
        relativeOrAbsolute.startsWith('http://') ||
        relativeOrAbsolute.startsWith('https://') ||
        relativeOrAbsolute.startsWith('blob:')
    ) {
        return relativeOrAbsolute;
    }
    const apiBase = (import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api').replace(/\/api\/?$/, '');
    const pathPart = relativeOrAbsolute.startsWith('/uploads/')
        ? relativeOrAbsolute
        : relativeOrAbsolute.startsWith('/')
            ? relativeOrAbsolute
            : null;
    if (pathPart) {
        return `${apiBase}/api${pathPart}`;
    }
    return `${apiBase}/api/uploads/${relativeOrAbsolute}`;
}

export function resolveChatAudioUrl(audioUrl) {
    if (!audioUrl) return null;
    if (audioUrl.startsWith('http') || audioUrl.startsWith('blob:')) return audioUrl;
    const pathPart = audioUrl.startsWith('/uploads/')
        ? audioUrl
        : `/uploads/audio/${audioUrl.replace(/^\//, '')}`;
    return resolveChatMediaUrl(pathPart);
}

export function resolveChatFileUrl(fileUrl) {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http') || fileUrl.startsWith('blob:')) return fileUrl;
    const pathPart = fileUrl.startsWith('/uploads/')
        ? fileUrl
        : `/uploads/files/${fileUrl.replace(/^\//, '')}`;
    return resolveChatMediaUrl(pathPart);
}

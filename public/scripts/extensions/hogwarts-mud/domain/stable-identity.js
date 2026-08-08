export function memoryFingerprint(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function normalizeMemoryId(value, fallback) {
    const normalized = String(value || '')
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return normalized || fallback;
}

export function getSceneTimelineDisplaySummary(
    value,
) {
    const source =
        String(value || '')
            .trim();
    if (!source.includes('\n')) {
        return source;
    }
    const lines =
        source.split('\n');
    const metadataLine =
        lines.at(-1)
            ?.trim() ||
        '';
    let metadata;
    try {
        metadata =
            JSON.parse(
                `{${metadataLine}}`,
            );
    } catch {
        return source;
    }
    if (
        Object.keys(
            metadata,
        ).length !== 1 ||
        typeof metadata
            .pacingBeatRealized !==
            'boolean'
    ) {
        return source;
    }
    return lines
        .slice(0, -1)
        .join('\n')
        .trim();
}

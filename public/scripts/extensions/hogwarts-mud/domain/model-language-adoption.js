const HAN_PATTERN =
    /\p{Script=Han}/u;

export const MODEL_OUTPUT_EVIDENCE_AUTHORITY =
    'model_output_evidence';

export function isEnglishAuthorityText(
    value,
) {
    const text =
        String(value || '').trim();
    return Boolean(
        text &&
        !HAN_PATTERN.test(text),
    );
}

export function createModelLanguageMismatch({
    taskId,
    fieldPath,
    recordId = '',
    language = 'non_en',
}) {
    return {
        code:
            'model_language_mismatch',
        taskId:
            String(taskId || '')
                .slice(0, 64),
        fieldPath:
            String(fieldPath || '')
                .slice(0, 256),
        recordId:
            String(recordId || '')
                .slice(0, 128),
        language:
            String(language || '')
                .slice(0, 16),
    };
}

export function adoptEnglishFields(
    source,
    {
        taskId,
        recordId = '',
        requiredFields = [],
        optionalFields = [],
    },
) {
    const accepted = {
        ...source,
    };
    const diagnostics = [];
    const rejectedFields = [];
    for (
        const field
        of [
            ...requiredFields,
            ...optionalFields,
        ]
    ) {
        if (
            !Object.hasOwn(
                source || {},
                field,
            )
        ) {
            continue;
        }
        if (
            isEnglishAuthorityText(
                source[field],
            )
        ) {
            continue;
        }
        delete accepted[field];
        if (
            String(
                source[field] ||
                '',
            ).trim()
        ) {
            rejectedFields.push(
                field,
            );
            diagnostics.push(
                createModelLanguageMismatch({
                    taskId,
                    fieldPath: field,
                    recordId,
                }),
            );
        }
    }
    const missingRequired =
        requiredFields.filter(field =>
            !isEnglishAuthorityText(
                accepted[field],
            ));
    return {
        accepted,
        diagnostics,
        rejectedFields,
        missingRequired,
        admissible:
            missingRequired.length ===
            0,
    };
}

export function partitionModelSegments(
    segments,
    {
        taskId,
    },
) {
    const diagnostics = [];
    const canonicalSegments = [];
    const displaySegments = [];
    (
        Array.isArray(segments)
            ? segments
            : []
    ).forEach((
        segment,
        index,
    ) => {
        const text =
            String(
                segment?.textEn ||
                segment?.rawText ||
                '',
            ).trim();
        if (!text) return;
        if (
            isEnglishAuthorityText(
                text,
            )
        ) {
            const canonical = {
                ...segment,
                textEn: text,
            };
            delete canonical.rawText;
            delete canonical.language;
            delete canonical.authority;
            canonicalSegments.push(
                canonical,
            );
            displaySegments.push(
                canonical,
            );
            return;
        }
        const raw = {
            type:
                segment?.type ||
                'narration',
            ...(segment?.actorId
                ? {
                    actorId:
                        segment.actorId,
                }
                : {}),
            rawText: text,
            language: 'non_en',
            authority:
                MODEL_OUTPUT_EVIDENCE_AUTHORITY,
        };
        displaySegments.push(raw);
        diagnostics.push(
            createModelLanguageMismatch({
                taskId,
                fieldPath:
                    `segments[${index}].textEn`,
                recordId:
                    String(index),
            }),
        );
    });
    return {
        canonicalSegments,
        displaySegments,
        diagnostics,
    };
}

export function collectNonEnglishAuthorityFields(
    value,
    {
        path = '',
        output = [],
    } = {},
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach((
            entry,
            index,
        ) =>
            collectNonEnglishAuthorityFields(
                entry,
                {
                    path:
                        `${path}[${index}]`,
                    output,
                },
            ));
        return output;
    }
    Object.entries(value)
        .forEach(([
            key,
            entry,
        ]) => {
            const fieldPath =
                path
                    ? `${path}.${key}`
                    : key;
            if (
                /En$/u.test(key) &&
                typeof entry ===
                    'string' &&
                entry.trim() &&
                !isEnglishAuthorityText(
                    entry,
                )
            ) {
                output.push(
                    fieldPath,
                );
                return;
            }
            collectNonEnglishAuthorityFields(
                entry,
                {
                    path:
                        fieldPath,
                    output,
                },
            );
        });
    return output;
}

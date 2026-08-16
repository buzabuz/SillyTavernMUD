const SPELL_FIELD_PATHS =
    Object.freeze({
        name: 'nameEn',
        nameEn: 'nameEn',
        effect: 'effectEn',
        effectEn: 'effectEn',
    });

export function createSpellLocalizationField(
    spell,
    field,
) {
    const fieldPath =
        SPELL_FIELD_PATHS[field] ||
        '';
    const staticField =
        fieldPath.replace(
            /En$/u,
            '',
        );
    return {
        staticKey:
            spell?.id &&
            staticField
                ? `spell.${spell.id}.${staticField}`
                : '',
        recordKind:
            'spell_definition',
        recordId:
            String(
                spell?.id ||
                '',
            ),
        fieldPath,
        sourceTextEn:
            String(
                spell?.[fieldPath] ||
                '',
            ),
    };
}

export function createSpellLocalizationFields(
    spell,
) {
    return [
        createSpellLocalizationField(
            spell,
            'nameEn',
        ),
        createSpellLocalizationField(
            spell,
            'effectEn',
        ),
    ];
}

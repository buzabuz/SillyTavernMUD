const ITEM_DISPLAY_FIELDS =
    Object.freeze({
        label: 'labelEn',
        appearance:
            'appearanceEn',
        notes: 'notesEn',
    });

export function createItemLocalizationFields(
    item,
) {
    return Object.fromEntries(
        Object.entries(
            ITEM_DISPLAY_FIELDS,
        ).map(([
            displayField,
            fieldPath,
        ]) => [
            displayField,
            {
                recordKind:
                    'item',
                recordId:
                    String(
                        item?.id ||
                        '',
                    ),
                fieldPath,
                sourceTextEn:
                    String(
                        item?.[
                            fieldPath
                        ] ||
                        '',
                    ),
            },
        ]),
    );
}

export function getVisibleItemLocalizationFields(
    item,
) {
    const fields =
        createItemLocalizationFields(
            item,
        );
    return [
        fields.label,
        fields.appearance,
        ...(
            fields.notes
                .sourceTextEn
                ? [
                    fields.notes,
                ]
                : []
        ),
    ];
}

export function localizeItemCard(
    card,
    item,
    getLocalizedField,
) {
    const fields =
        createItemLocalizationFields(
            item,
        );
    return {
        ...card,
        label:
            getLocalizedField(
                fields.label,
            ).text ||
            card.label,
        appearance:
            getLocalizedField(
                fields.appearance,
            ).text ||
            card.appearance,
        notes:
            fields.notes
                .sourceTextEn
                ? getLocalizedField(
                    fields.notes,
                ).text ||
                card.notes
                : card.notes,
    };
}

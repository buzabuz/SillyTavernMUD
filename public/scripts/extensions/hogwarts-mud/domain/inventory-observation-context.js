export function buildDynamicInventoryContext(
    state,
) {
    return (
        state.items ||
        []
    ).map(item => ({
        id:
            item.id,
        labelEn:
            item.labelEn ||
            '',
        label:
            item.label ||
            item.labelEn ||
            '',
        appearanceEn:
            item.appearanceEn ||
            item.detailEn ||
            '',
        type:
            item.type ||
            item.kind ||
            'other',
        ownerId:
            item.ownerId ||
            'player',
        holderId:
            item.holderId ||
            (
                [
                    'carried',
                    'equipped',
                ].includes(
                    item.custody,
                )
                    ? item.ownerId ||
                    'player'
                    : ''
            ),
        state:
            item.state ||
            item.status ||
            'intact',
        isEquipped:
            item.isEquipped ===
                true ||
            item.custody ===
                'equipped',
    }));
}

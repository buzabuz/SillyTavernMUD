function appendText(
    parent,
    tag,
    className,
    text,
) {
    const element =
        document.createElement(
            tag,
        );
    element.className =
        className;
    element.textContent =
        text;
    parent.append(element);
    return element;
}

export function createItemCard(
    item,
    {
        compact = false,
        onReferenceItem =
        null,
    } = {},
) {
    const card =
        document.createElement(
            'article',
        );
    card.className =
        `hpmud-item-card type-${item.type} state-${item.state}${
            compact
                ? ' is-compact'
                : ''
        }`;
    card.dataset.itemId =
        item.id;

    const header =
        document.createElement(
            'header',
        );
    const seal =
        document.createElement(
            'span',
        );
    seal.className =
        'hpmud-item-seal';
    seal.textContent =
        item.typeLabel
            .slice(0, 2);
    const title =
        document.createElement(
            'div',
        );
    appendText(
        title,
        'small',
        'hpmud-item-type',
        item.typeLabel,
    );
    appendText(
        title,
        'strong',
        'hpmud-item-title',
        item.label,
    );
    const state =
        appendText(
            header,
            'span',
            'hpmud-item-state',
            item.stateLabel,
        );
    if (item.isEquipped) {
        state.textContent =
            `${item.stateLabel} · 穿戴中`;
    }
    header.prepend(
        seal,
        title,
    );

    const appearance =
        appendText(
            card,
            'p',
            'hpmud-item-appearance',
            item.appearance,
        );
    appearance.title =
        item.appearance;

    const custody =
        document.createElement(
            'div',
        );
    custody.className =
        'hpmud-item-custody';
    appendText(
        custody,
        'span',
        '',
        item.ownershipLabel,
    );
    appendText(
        custody,
        'span',
        '',
        item.locationLabel,
    );
    if (
        item.transferLabel
    ) {
        appendText(
            custody,
            'span',
            'is-transfer',
            item.transferLabel,
        );
    }

    const roles =
        document.createElement(
            'div',
        );
    roles.className =
        'hpmud-item-roles';
    item.storyRoles
        .forEach(role => {
            const badge =
                appendText(
                    roles,
                    'span',
                    `role-${role.id}`,
                    role.label,
                );
            badge.title =
                `剧情角色：${role.label}`;
        });

    card.append(
        header,
        appearance,
        custody,
    );
    if (
        item.storyRoles
            .length
    ) {
        card.append(roles);
    }
    if (
        !compact &&
        item.notes
    ) {
        appendText(
            card,
            'p',
            'hpmud-item-notes',
            item.notes,
        );
    }
    if (!compact) {
        const provenance =
            document.createElement(
                'footer',
            );
        provenance.className =
            'hpmud-item-provenance';
        appendText(
            provenance,
            'span',
            '',
            item.acquiredLabel,
        );
        appendText(
            provenance,
            'span',
            '',
            `来源 · ${
                item.sourceEventId ||
                '未记录'
            }`,
        );
        if (
            /^https:\/\//u.test(
                item.sourceUrl ||
                '',
            )
        ) {
            const sourceLink =
                document.createElement(
                    'a',
                );
            sourceLink.href =
                item.sourceUrl;
            sourceLink.target =
                '_blank';
            sourceLink.rel =
                'noopener noreferrer';
            sourceLink.textContent =
                '查看 Canon 资料';
            provenance.append(
                sourceLink,
            );
        }
        card.append(
            provenance,
        );
    }
    if (
        typeof onReferenceItem ===
            'function'
    ) {
        const actions =
            document.createElement(
                'div',
            );
        actions.className =
            'hpmud-item-card-actions';
        const reference =
            document.createElement(
                'button',
            );
        reference.type = 'button';
        reference.className =
            'hpmud-item-reference';
        reference.textContent =
            '引用到输入';
        reference.title =
            `使用稳定 Item ID：${item.id}`;
        reference.addEventListener(
            'click',
            () =>
                onReferenceItem(
                    item,
                ),
        );
        actions.append(
            reference,
        );
        card.append(
            actions,
        );
    }
    return card;
}

export function createItemLedger(
    projection,
    {
        onReferenceItem =
        null,
    } = {},
) {
    const ledger =
        document.createElement(
            'div',
        );
    ledger.className =
        'hpmud-item-ledger';
    if (
        !projection.cards.length
    ) {
        const empty =
            document.createElement(
                'section',
            );
        empty.className =
            'hpmud-item-empty';
        appendText(
            empty,
            'strong',
            '',
            '还没有需要正式追踪的物品',
        );
        appendText(
            empty,
            'p',
            '',
            '普通校服、课本、羽毛笔和生活用品仍可自然使用，但不会占用物品档案。',
        );
        ledger.append(empty);
        return ledger;
    }

    const appendGroup =
        (
            label,
            items,
        ) => {
            if (!items.length) {
                return;
            }
            const group =
                document.createElement(
                    'section',
                );
            group.className =
                'hpmud-item-group';
            const heading =
                document.createElement(
                    'header',
                );
            appendText(
                heading,
                'strong',
                '',
                label,
            );
            appendText(
                heading,
                'small',
                '',
                String(
                    items.length,
                ),
            );
            const cards =
                document.createElement(
                    'div',
                );
            cards.className =
                'hpmud-item-grid';
            items.forEach(item =>
                cards.append(
                    createItemCard(
                        item,
                        {
                            onReferenceItem,
                        },
                    ),
                ));
            group.append(
                heading,
                cards,
            );
            ledger.append(group);
        };
    appendGroup(
        '当前物品',
        projection.active,
    );
    appendGroup(
        '失去与消耗记录',
        projection.history,
    );
    return ledger;
}

export function createItemCandidateCard(
    candidate,
    item,
    {
        decision = 'pending',
        onAccept,
        onIgnore,
    } = {},
) {
    const docket =
        document.createElement(
            'aside',
        );
    docket.className =
        `hpmud-item-candidate decision-${decision}`;
    docket.dataset
        .itemProposalKey =
        candidate.key;
    const heading =
        document.createElement(
            'header',
        );
    appendText(
        heading,
        'small',
        '',
        'ITEM LEDGER · 待确认',
    );
    appendText(
        heading,
        'strong',
        '',
        decision ===
            'accepted'
            ? '已收录到物品档案'
            : decision ===
                'ignored'
                ? '已忽略这条候选'
                : '发现可能值得收录的物品',
    );
    docket.append(
        heading,
        createItemCard(
            item,
            {
                compact: true,
            },
        ),
    );
    if (
        candidate.evidenceText
    ) {
        const evidence =
            document.createElement(
                'blockquote',
            );
        evidence.textContent =
            candidate
                .evidenceText;
        docket.append(
            evidence,
        );
    }
    if (
        decision ===
            'pending'
    ) {
        const actions =
            document.createElement(
                'div',
            );
        actions.className =
            'hpmud-item-candidate-actions';
        const accept =
            document.createElement(
                'button',
            );
        accept.type = 'button';
        accept.className =
            'is-primary';
        accept.textContent =
            '收录';
        const ignore =
            document.createElement(
                'button',
            );
        ignore.type = 'button';
        ignore.textContent =
            '忽略';
        const resolve =
            async (
                button,
                handler,
            ) => {
                accept.disabled =
                    true;
                ignore.disabled =
                    true;
                button.textContent =
                    '处理中…';
                try {
                    await handler?.(
                        candidate.key,
                    );
                } catch (error) {
                    accept.disabled =
                        false;
                    ignore.disabled =
                        false;
                    button.textContent =
                        button === accept
                            ? '收录'
                            : '忽略';
                    toastr.error(
                        String(
                            error
                                ?.message ||
                            error,
                        ),
                    );
                }
            };
        accept.addEventListener(
            'click',
            () =>
                resolve(
                    accept,
                    onAccept,
                ),
        );
        ignore.addEventListener(
            'click',
            () =>
                resolve(
                    ignore,
                    onIgnore,
                ),
        );
        actions.append(
            accept,
            ignore,
        );
        docket.append(
            actions,
        );
    }
    return docket;
}

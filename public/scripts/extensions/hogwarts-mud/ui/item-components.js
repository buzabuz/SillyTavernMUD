import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';

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

function staticText(
    displayLocale,
    staticKey,
    sourceTextEn,
) {
    return getStaticLocaleText(
        staticKey,
        normalizeDisplayLocale(
            displayLocale,
        ),
    ) ||
        sourceTextEn;
}

function formatStaticText(
    displayLocale,
    staticKey,
    sourceTextEn,
    values = {},
) {
    return Object.entries(
        values,
    ).reduce(
        (
            text,
            [
                key,
                value,
            ],
        ) =>
            text.replaceAll(
                `{${key}}`,
                String(value),
            ),
        staticText(
            displayLocale,
            staticKey,
            sourceTextEn,
        ),
    );
}

export function createItemCard(
    item,
    {
        compact = false,
        onReferenceItem =
        null,
        displayLocale =
        'zh-CN',
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
            `${item.stateLabel} · ${staticText(
                displayLocale,
                'ui.item.component.equipped',
                'Equipped',
            )}`;
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
                formatStaticText(
                    displayLocale,
                    'ui.item.component.story_role',
                    'Story role: {role}',
                    {
                        role:
                            role.label,
                    },
                );
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
            formatStaticText(
                displayLocale,
                'ui.item.component.source',
                'Source · {source}',
                {
                    source:
                        item.sourceEventId
                            ? staticText(
                                displayLocale,
                                'ui.item.component.recorded',
                                'Recorded',
                            )
                            : staticText(
                                displayLocale,
                                'ui.item.component.unrecorded',
                                'Unrecorded',
                            ),
                },
            ),
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
                staticText(
                    displayLocale,
                    'ui.item.component.canon_link',
                    'View Canon source',
                );
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
            staticText(
                displayLocale,
                'ui.item.component.reference',
                'Reference in input',
            );
        reference.title =
            staticText(
                displayLocale,
                'ui.item.component.reference_title',
                'Reference this Item in the composer',
            );
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
        displayLocale =
        'zh-CN',
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
            staticText(
                displayLocale,
                'ui.item.component.empty_title',
                'No Items require formal tracking yet',
            ),
        );
        appendText(
            empty,
            'p',
            '',
            staticText(
                displayLocale,
                'ui.item.component.empty_detail',
                'Ordinary uniforms, textbooks, quills, and daily supplies remain usable without occupying the Item archive.',
            ),
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
                            displayLocale,
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
        staticText(
            displayLocale,
            'ui.item.component.active',
            'Current Items',
        ),
        projection.active,
    );
    appendGroup(
        staticText(
            displayLocale,
            'ui.item.component.history',
            'Loss and consumption history',
        ),
        projection.history,
    );
    return ledger;
}

export function createItemCandidateCard(
    candidate,
    item,
    {
        decision = 'pending',
        disabled = false,
        readOnly = false,
        onAccept,
        onIgnore,
        displayLocale =
        'zh-CN',
    } = {},
) {
    const acceptLabel =
        staticText(
            displayLocale,
            'ui.proposal.accept',
            'Accept',
        );
    const ignoreLabel =
        staticText(
            displayLocale,
            'ui.proposal.ignore',
            'Ignore',
        );
    const processingLabel =
        staticText(
            displayLocale,
            'ui.proposal.processing',
            'Processing...',
        );
    const decisionLabel =
        value =>
            value === 'pending'
                ? staticText(
                    displayLocale,
                    'ui.proposal.discovered_item',
                    'Item discovered',
                )
                : value ===
                    'accepted'
                    ? staticText(
                        displayLocale,
                        'ui.proposal.accepted',
                        'Accepted',
                    )
                    : staticText(
                        displayLocale,
                        'ui.proposal.ignored',
                        'Ignored',
                    );
    const docket =
        document.createElement(
            'aside',
        );
    docket.className =
        `hpmud-item-candidate decision-${decision}`;
    docket.dataset
        .itemProposalKey =
        candidate.key;
    docket.tabIndex = 0;

    const summary =
        document.createElement(
            'div',
        );
    summary.className =
        'hpmud-item-candidate-summary';
    const mark =
        appendText(
            summary,
            'span',
            'hpmud-item-candidate-mark',
            item.typeLabel
                .slice(0, 1),
        );
    mark.setAttribute(
        'aria-hidden',
        'true',
    );
    const copy =
        document.createElement(
            'span',
        );
    const status =
        appendText(
            copy,
            'small',
            '',
            decisionLabel(
                decision,
            ),
        );
    appendText(
        copy,
        'strong',
        '',
        item.label,
    );
    appendText(
        copy,
        'span',
        'hpmud-item-candidate-meta',
        [
            item.typeLabel,
            item.transferLabel,
        ]
            .filter(Boolean)
            .join(' · ') ||
            item.stateLabel,
    );
    summary.append(copy);

    const details =
        document.createElement(
            'div',
        );
    details.className =
        'hpmud-item-candidate-details';
    details.id =
        `hpmud-item-candidate-details-${
            String(candidate.key || '')
                .replace(
                    /[^a-z0-9_-]+/giu,
                    '-',
                )
        }`;
    details.setAttribute(
        'role',
        'tooltip',
    );
    docket.setAttribute(
        'aria-describedby',
        details.id,
    );
    appendText(
        details,
        'p',
        'hpmud-item-candidate-appearance',
        item.appearance,
    );
    appendText(
        details,
        'p',
        'hpmud-item-candidate-custody',
        [
            item.ownershipLabel,
            item.locationLabel,
            item.stateLabel,
        ]
            .filter(Boolean)
            .join(' · '),
    );
    if (candidate.evidenceText) {
        appendText(
            details,
            'blockquote',
            '',
            candidate.evidenceText,
        );
    }

    const actions =
        document.createElement(
            'div',
        );
    actions.className =
        'hpmud-item-candidate-actions';
    const info =
        document.createElement(
            'button',
        );
    info.type = 'button';
    info.className =
        'hpmud-item-candidate-info';
    info.textContent =
        staticText(
            displayLocale,
            'ui.proposal.details',
            'Details',
        );
    info.setAttribute(
        'aria-expanded',
        'false',
    );
    info.setAttribute(
        'aria-controls',
        details.id,
    );
    info.addEventListener(
        'click',
        () => {
            const open =
                docket.classList
                    .toggle(
                        'is-details-open',
                    );
            info.setAttribute(
                'aria-expanded',
                String(open),
            );
        },
    );
    actions.append(info);

    if (
        decision ===
            'pending' &&
        !readOnly
    ) {
        const accept =
            document.createElement(
                'button',
            );
        accept.type = 'button';
        accept.className =
            'is-primary';
        accept.textContent =
            acceptLabel;
        accept.disabled =
            disabled;
        const ignore =
            document.createElement(
                'button',
            );
        ignore.type = 'button';
        ignore.textContent =
            ignoreLabel;
        ignore.disabled =
            disabled;
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
                    processingLabel;
                try {
                    await handler?.(
                        candidate.key,
                    );
                    const resolvedDecision =
                        button === accept
                            ? 'accepted'
                            : 'ignored';
                    if (docket.isConnected) {
                        docket.className =
                            `hpmud-item-candidate decision-${resolvedDecision}`;
                        status.textContent =
                            decisionLabel(
                                resolvedDecision,
                            );
                        actions.replaceChildren(
                            info,
                        );
                    }
                    if (
                        resolvedDecision ===
                            'accepted'
                    ) {
                        toastr.success(
                            staticText(
                                displayLocale,
                                'ui.proposal.item_accepted',
                                'Added to Item archive',
                            ),
                        );
                    } else {
                        toastr.info(
                            staticText(
                                displayLocale,
                                'ui.proposal.item_ignored',
                                'Ignored this Item candidate',
                            ),
                        );
                    }
                } catch (error) {
                    accept.disabled =
                        false;
                    ignore.disabled =
                        false;
                    button.textContent =
                        button === accept
                            ? acceptLabel
                            : ignoreLabel;
                    toastr.error(
                        String(
                            error
                                ?.message ||
                            error,
                        ),
                    );
                } finally {
                    if (
                        button.isConnected &&
                        button.textContent ===
                            processingLabel
                    ) {
                        accept.disabled =
                            false;
                        ignore.disabled =
                            false;
                        button.textContent =
                            button === accept
                                ? acceptLabel
                                : ignoreLabel;
                    }
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
    }
    docket.addEventListener(
        'keydown',
        event => {
            if (
                event.key !==
                    'Escape'
            ) {
                return;
            }
            docket.classList.remove(
                'is-details-open',
            );
            info.setAttribute(
                'aria-expanded',
                'false',
            );
            docket.focus();
        },
    );
    docket.append(
        summary,
        actions,
        details,
    );
    return docket;
}

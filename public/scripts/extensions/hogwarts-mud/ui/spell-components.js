import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';

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

export function createSpellCandidateCard(
    candidate,
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
                    'ui.proposal.discovered_spell',
                    'New spell discovered',
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
    const card =
        document.createElement(
            'aside',
        );
    card.className =
        `hpmud-item-candidate hpmud-spell-candidate decision-${decision}`;
    card.dataset
        .spellProposalKey =
        candidate.key;
    card.tabIndex = 0;

    const summary =
        document.createElement(
            'div',
        );
    summary.className =
        'hpmud-item-candidate-summary';
    const mark =
        document.createElement(
            'span',
        );
    mark.className =
        'hpmud-item-candidate-mark';
    mark.textContent = '✦';
    mark.setAttribute(
        'aria-hidden',
        'true',
    );
    const copy =
        document.createElement(
            'span',
        );
    const status =
        document.createElement(
            'small',
        );
    status.textContent =
        decisionLabel(
            decision,
        );
    const title =
        document.createElement(
            'strong',
        );
    title.textContent =
        candidate.incantation;
    const meta =
        document.createElement(
            'span',
        );
    meta.className =
        'hpmud-item-candidate-meta';
    meta.textContent =
        candidate
            .authorityConflicts
            ?.length
            ? staticText(
                displayLocale,
                'ui.proposal.spell_conflict',
                'Non-authoritative incantation · Player confirmation required',
            )
            : staticText(
                displayLocale,
                'ui.proposal.spell_custom',
                'Custom spell · Player confirmation required',
            );
    copy.append(
        status,
        title,
        meta,
    );
    summary.append(
        mark,
        copy,
    );

    const details =
        document.createElement(
            'div',
        );
    details.className =
        'hpmud-item-candidate-details';
    details.id =
        `hpmud-spell-candidate-details-${
            String(
                candidate.key ||
                '',
            ).replace(
                /[^a-z0-9_-]+/giu,
                '-',
            )
        }`;
    details.setAttribute(
        'role',
        'tooltip',
    );
    card.setAttribute(
        'aria-describedby',
        details.id,
    );
    const effect =
        document.createElement(
            'p',
        );
    effect.className =
        'hpmud-item-candidate-appearance';
    effect.textContent =
        candidate
            .definition
            ?.effect ||
        candidate
            .definition
            ?.effectEn ||
        staticText(
            displayLocale,
            'ui.proposal.spell_effect_evidence',
            'The effect is defined by this narrative evidence.',
        );
    details.append(effect);
    if (candidate.evidenceText) {
        const evidence =
            document.createElement(
                'blockquote',
            );
        evidence.textContent =
            candidate.evidenceText;
        details.append(evidence);
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
                card.classList
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
    if (decision === 'pending' && !readOnly) {
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
                    const accepted =
                        button === accept;
                    if (card.isConnected) {
                        card.className =
                            `hpmud-item-candidate hpmud-spell-candidate decision-${
                                accepted
                                    ? 'accepted'
                                    : 'ignored'
                            }`;
                        status.textContent =
                            decisionLabel(
                                accepted
                                    ? 'accepted'
                                    : 'ignored',
                            );
                        actions
                            .replaceChildren(
                                info,
                            );
                    }
                    if (accepted) {
                        toastr.success(
                            staticText(
                                displayLocale,
                                'ui.proposal.spell_accepted',
                                'Added to learned spells',
                            ),
                        );
                    } else {
                        toastr.info(
                            staticText(
                                displayLocale,
                                'ui.proposal.spell_ignored',
                                'Ignored this spell candidate',
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
    card.append(
        summary,
        details,
        actions,
    );
    return card;
}

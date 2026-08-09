export function createSpellCandidateCard(
    candidate,
    {
        decision = 'pending',
        onAccept,
        onIgnore,
    } = {},
) {
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
        decision === 'pending'
            ? '发现新咒语'
            : decision ===
                'accepted'
                ? '已收录'
                : '已忽略';
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
            ? '非权威咒文 · 需玩家确认'
            : '自定义咒语 · 需玩家确认';
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
        '效果由这段叙事证据定义。';
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
    info.textContent = '详情';
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
    if (decision === 'pending') {
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
                            accepted
                                ? '已收录'
                                : '已忽略';
                        actions
                            .replaceChildren(
                                info,
                            );
                    }
                    if (accepted) {
                        toastr.success(
                            '已收录到咒语学习列表',
                        );
                    } else {
                        toastr.info(
                            '已忽略这条咒语候选',
                        );
                    }
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
    }
    card.append(
        summary,
        details,
        actions,
    );
    return card;
}

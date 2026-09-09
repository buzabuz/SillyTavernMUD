import {
    createItemCandidateCard,
} from './item-components.js';
import {
    createSpellCandidateCard,
} from './spell-components.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';
import {
    createActorNameField,
    createActorRoleField,
    getActorDisplayName,
} from '../domain/actor-display-name.js';
import {
    getCanonLocalizationZhCn,
} from '../canon-localization.zh-cn.js';
import {
    getVisibleItemLocalizationFields,
    localizeItemCard,
} from '../domain/item-localization.js';
import {
    createSpellLocalizationFields,
} from '../domain/spell-localization.js';
import {
    createCharacterInputLocalizationField,
} from '../domain/localization-candidates.js';

export function createMessageRenderer(ports) {
    const {
        session,
    } = ports;

    const {
        LIVE_STREAM_PHASE_LABELS,
        MAX_RENDERED_MESSAGES,
        acceptItemCandidate,
        acceptSpellCandidate,
        getContext,
        getItemProposalDecision,
        getLocalizedField =
        field => ({
            text:
                    field.rawText ||
                    field
                        .sourceTextEn ||
                    '',
            status:
                    field.rawText
                        ? 'raw_evidence'
                        : 'source',
        }),
        getSpellProposalDecision,
        getSettings,
        getRoomName =
        (_state, _mapId, roomId) =>
            roomId || '',
        getWorldState,
        ignoreItemCandidate,
        ignoreSpellCandidate,
        initials,
        ensureLocalizedFields =
        async () => [],
        isSaveRevisionBlocked =
        () => false,
        normalizeTranslationProvider,
        projectItemCard,
        translateMessage,
    } = ports;

    function staticText(
        staticKey,
        sourceTextEn,
    ) {
        return getStaticLocaleText(
            staticKey,
            normalizeDisplayLocale(
                session.displayLocale,
            ),
        ) ||
            sourceTextEn;
    }

    function formatStaticText(
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
                staticKey,
                sourceTextEn,
            ),
        );
    }

    function formatMessageText(message, text) {
        const context = getContext();
        return context.messageFormatting(
            String(text ?? ''),
            message.name || '',
            Boolean(message.is_system),
            Boolean(message.is_user),
            -1,
            {},
            false,
        );
    }

    function renderCheckCard(check, { live = false } = {}) {
        const card = document.createElement('section');
        card.className =
            `hpmud-check-card outcome-${check.outcome}` +
            (live ? ' is-live' : '');
        const modifier = Number(check.modifiers?.total || 0);
        const modifierText = modifier >= 0
            ? `+${modifier}`
            : String(modifier);
        const rolls = (check.rolls || []).join(' / ');
        const targetActorId =
            check.target?.actorId;
        const targetActor =
            targetActorId
                ? [
                    ...(
                        getWorldState()
                            ?.actorLibrary ||
                        []
                    ),
                    ...(
                        getWorldState()
                            ?.actors ||
                        []
                    ),
                ].find(actor =>
                    actor.id ===
                    targetActorId)
                : null;
        const targetField =
            targetActor
                ? {
                    recordKind:
                        'actor_core',
                    recordId:
                        targetActorId,
                    fieldPath:
                        'nameEn',
                    sourceTextEn:
                        targetActor
                            .nameEn ||
                        targetActorId,
                }
                : null;
        if (targetField) {
            void Promise.resolve(
                ensureLocalizedFields(
                    [
                        targetField,
                    ],
                    {
                        priority: 1,
                    },
                ),
            ).catch(() => {});
        }
        const targetName =
            targetField
                ? getActorDisplayName({
                    actorId:
                        targetActorId,
                    nameEn:
                        targetActor
                            ?.nameEn,
                    displayLocale:
                        session
                            .displayLocale,
                    getLocalizedField,
                })
                : '';
        const targetText = targetName
            ? `${staticText(
                'check.target.opposed',
                'Opposed',
            )} ${targetName} · ${staticText(
                'check.target.hidden',
                'hidden difficulty',
            )}`
            : staticText(
                'check.target.environment',
                'Hidden environment difficulty',
            );
        const observationSucceeded =
            [
                'success_with_cost',
                'success',
                'critical_success',
            ].includes(
                check.outcome,
            );
        const spellText =
            check.spell
                ? [
                    check.spell
                        .incantation,
                    check.spell
                        .known
                        ? formatStaticText(
                            'ui.message.proficiency_modifier',
                            'Proficiency modifier {value}',
                            {
                                value:
                                    `${
                                        Number(
                                            check
                                                .modifiers
                                                ?.proficiency ||
                                            0,
                                        ) >=
                                            0
                                            ? '+'
                                            : ''
                                    }${Number(
                                        check
                                            .modifiers
                                            ?.proficiency ||
                                        0,
                                    )}`,
                            },
                        )
                        : staticText(
                            'ui.message.unlearned_spell',
                            'Unlearned spell · experiment difficulty',
                        ),
                ].join(' · ')
                : check.spellObservation
                    ? observationSucceeded
                        ? [
                            check
                                .spellObservation
                                .incantation,
                            staticText(
                                'ui.message.active_observation',
                                'Active observation',
                            ),
                        ].join(' · ')
                        : staticText(
                            'ui.message.unidentified_spell',
                            'Spell not identified',
                        )
                    : '';
        card.innerHTML = `
        <div class="hpmud-check-die">
            <small>D20</small>
            <strong></strong>
        </div>
        <div class="hpmud-check-copy">
            <small></small>
            <strong></strong>
            <span></span>
        </div>
        <div class="hpmud-check-total">
            <small></small>
            <strong></strong>
        </div>
    `;
        card.querySelector('.hpmud-check-die strong')
            .textContent = String(check.keptRoll);
        card.querySelector('.hpmud-check-copy small')
            .textContent = [
                live
                    ? staticText(
                        'ui.message.rules_resolved',
                        'RULES RESOLVED · Continuing',
                    )
                    : staticText(
                        'ui.message.d20_check',
                        'D20 CHECK · Local adjudication',
                    ),
                check.rollMode === 'advantage'
                    ? staticText(
                        'ui.message.advantage',
                        'Advantage',
                    )
                    : check.rollMode === 'disadvantage'
                        ? staticText(
                            'ui.message.disadvantage',
                            'Disadvantage',
                        )
                        : '',
            ].filter(Boolean).join(' · ');
        card.querySelector('.hpmud-check-copy strong')
            .textContent = [
                staticText(
                    `check.rule.${check.kind}`,
                    check.labelEn ||
                        check.kind,
                ),
                staticText(
                    `check.outcome.${check.outcome}`,
                    check.outcomeLabelEn ||
                        check.outcome,
                ),
            ].join(' · ');
        card.querySelector('.hpmud-check-copy span')
            .textContent = [
                spellText,
                `${staticText(
                    `attribute.${check.attribute}`,
                    check.attributeLabelEn ||
                        check.attribute,
                )} ${rolls} ${modifierText} = ${check.total}`,
                targetText,
            ].filter(Boolean).join(' · ');
        card.querySelector('.hpmud-check-total small')
            .textContent =
                staticText(
                    'check.total',
                    'Total',
                );
        card.querySelector('.hpmud-check-total strong')
            .textContent = String(check.total);
        return card;
    }

    function renderAuthorQuillCard(
        {
            authorQuill,
            authorQuillEn,
        },
        message = {},
    ) {
        const english = String(authorQuillEn || '').trim();
        const translated = String(
            authorQuill || english,
        ).trim();
        if (!english && !translated) return null;

        const card = document.createElement('section');
        card.className = 'hpmud-author-quill';
        card.innerHTML = `
        <header>
            <span class="hpmud-quill-mark"><i></i></span>
            <span>
                <small>OUT OF CHARACTER · CHAPTER NOTES</small>
                <strong></strong>
            </span>
            <b></b>
        </header>
        <p class="hpmud-quill-disclaimer"></p>
        <div class="hpmud-quill-copy"></div>
    `;
        card.querySelector(
            'header small',
        ).textContent =
            staticText(
                'ui.message.quill.kicker',
                'Out of character · Chapter notes',
            );
        card.querySelector(
            'header strong',
        ).textContent =
            staticText(
                'ui.message.quill.title',
                'The Author\'s Quill',
            );
        card.querySelector(
            'header b',
        ).textContent =
            staticText(
                'ui.message.quill.chapter_note',
                'Chapter note',
            );
        card.querySelector(
            '.hpmud-quill-disclaimer',
        ).textContent =
            staticText(
                'ui.message.quill.disclaimer',
                'Not character knowledge · No spoilers · The editorial office assumes no liability for furniture damaged by player strategy',
            );
        const copy = card.querySelector(
            '.hpmud-quill-copy',
        );
        const localized = document.createElement('div');
        localized.className = 'hpmud-translation';
        localized.innerHTML = formatMessageText(
            message,
            translated,
        );
        copy.append(localized);
        if (english && translated !== english) {
            const original = document.createElement('div');
            original.className = 'hpmud-original';
            original.innerHTML = formatMessageText(
                message,
                english,
            );
            copy.append(original);
        }
        return card;
    }

    function getTranslationProviderLabel(
        provider,
    ) {
        const normalized =
            normalizeTranslationProvider(
                provider,
            );
        if (
            [
                'google',
                'bing',
            ].includes(
                normalized,
            )
        ) {
            return normalized
                .charAt(0)
                .toUpperCase() +
                normalized.slice(1);
        }
        return staticText(
            normalized === 'off'
                ? 'ui.translation.off'
                : 'ui.translation.local',
            normalized === 'off'
                ? 'Off'
                : 'Local 4B',
        );
    }

    function createMessageTranslationControl(
        article,
        message,
        messageId,
        {
            readOnly = false,
        } = {},
    ) {
        const translation =
            message.extra
                ?.hogwartsMud ||
            {};
        const details =
            document.createElement(
                'details',
            );
        details.className =
            'hpmud-message-translation hpmud-scene-language';
        const summary =
            document.createElement(
                'summary',
            );
        summary.textContent =
            staticText(
                'ui.message.translation.english_short',
                'EN',
            );
        summary.title =
            readOnly
                ? staticText(
                    'ui.message.translation.toggle',
                    'Switch language',
                )
                : staticText(
                    'ui.message.translation.toggle_or_retranslate',
                    'Switch language or retranslate',
                );

        const menu =
            document.createElement(
                'div',
            );
        menu.className =
            'hpmud-message-translation-menu';
        const status =
            document.createElement(
                'div',
            );
        status.className =
            'hpmud-message-translation-status';
        status.textContent =
            formatStaticText(
                'ui.message.translation.current',
                'Current: {provider}',
                {
                    provider:
                        getTranslationProviderLabel(
                            translation.provider ||
                            getSettings()
                                .translationProvider,
                        ),
                },
            ) +
            (
                translation
                    .translationVersion
                    ? ` · v${translation.translationVersion}`
                    : ''
            );

        const chinese =
            document.createElement(
                'button',
            );
        chinese.type = 'button';
        chinese.textContent =
            staticText(
                'ui.message.translation.show_chinese',
                'Show Chinese translation',
            );
        chinese.setAttribute(
            'aria-checked',
            'true',
        );
        const english =
            document.createElement(
                'button',
            );
        english.type = 'button';
        english.textContent =
            staticText(
                'ui.message.translation.show_english',
                'Show English source',
            );
        english.setAttribute(
            'aria-checked',
            'false',
        );
        const setOriginal =
            showOriginal => {
                article.classList.toggle(
                    'show-original',
                    showOriginal,
                );
                chinese.setAttribute(
                    'aria-checked',
                    String(
                        !showOriginal,
                    ),
                );
                english.setAttribute(
                    'aria-checked',
                    String(
                        showOriginal,
                    ),
                );
                summary.textContent =
                    showOriginal
                        ? staticText(
                            'ui.message.translation.chinese_short',
                            'ZH',
                        )
                        : staticText(
                            'ui.message.translation.english_short',
                            'EN',
                        );
                details.open = false;
            };
        chinese.addEventListener(
            'click',
            () => setOriginal(false),
        );
        english.addEventListener(
            'click',
            () => setOriginal(true),
        );

        const retranslate =
            document.createElement(
                'button',
            );
        retranslate.type = 'button';
        retranslate.textContent =
            formatStaticText(
                'ui.message.translation.retranslate',
                'Retranslate · {provider}',
                {
                    provider:
                        getTranslationProviderLabel(
                            getSettings()
                                .translationProvider,
                        ),
                },
            );
        retranslate.disabled =
            Number(messageId) < 0 ||
            isSaveRevisionBlocked();
        retranslate.addEventListener(
            'click',
            async () => {
                retranslate.disabled =
                    true;
                status.textContent =
                    staticText(
                        'ui.message.translation.running',
                        'Retranslating...',
                    );
                await translateMessage(
                    Number(messageId),
                    {
                        force: true,
                        message,
                    },
                );
                if (
                    status
                        .isConnected
                ) {
                    status.textContent =
                        staticText(
                            'ui.message.translation.done',
                            'Retranslated',
                        );
                    retranslate.disabled =
                        isSaveRevisionBlocked();
                    setOriginal(false);
                }
            },
        );
        menu.append(
            status,
            chinese,
            english,
        );
        menu.append(retranslate);
        details.append(
            summary,
            menu,
        );
        return details;
    }

    function renderSegmentedMessage(
        message,
        messageId,
        segments,
        {
            readOnly = false,
        } = {},
    ) {
        const state = getWorldState();
        const actorLibrary =
            new Map();
        for (const actor of [
            ...(state.actorLibrary ||
                []),
            ...(state.actors ||
                []),
        ]) {
            actorLibrary.set(
                actor.id,
                {
                    ...(
                        actorLibrary
                            .get(
                                actor.id,
                            ) ||
                        {}
                    ),
                    ...actor,
                },
            );
        }
        const article = document.createElement('article');
        const admitted = new Set((message.extra?.hogwartsMud?.turnTransaction?.temporaryActorEntrances || []).map(actor => actor.id));
        const collisions = new Set((message.extra?.hogwartsMud?.speakers || [])
            .filter(speaker => actorLibrary.has(speaker.id) && !admitted.has(speaker.id)).map(speaker => speaker.id));
        article.className = 'hpmud-scene-turn';
        article.dataset.messageId = String(messageId);
        const authorQuillEn =
            message.extra?.hogwartsMud?.authorQuillEn;
        const authorQuillField = {
            recordKind:
                'author_quill',
            recordId:
                String(messageId),
            fieldPath:
                'authorQuillEn',
            sourceTextEn:
                authorQuillEn ||
                '',
        };
        const check = message.extra?.hogwartsMud
            ?.turnTransaction?.checkResolution;
        if (check) {
            article.append(renderCheckCard(check));
        }

        const localizationFields =
            segments.map((
                segment,
                index,
            ) => ({
                recordKind:
                    'message_segment',
                recordId:
                    `message:${messageId}:segment:${index}`,
                fieldPath: 'textEn',
                sourceTextEn:
                    segment.textEn ||
                    '',
                rawText:
                    segment.rawText ||
                    '',
            }));
        const actorNameFields = [
            ...new Set(
                segments
                    .filter(segment =>
                        segment.type ===
                            'dialogue' &&
                        segment.actorId)
                    .map(segment =>
                        segment
                            .actorId),
            ),
        ]
            .filter(actorId =>
                actorLibrary.has(actorId) && !collisions.has(actorId) && !getCanonLocalizationZhCn(
                    actorId,
                ))
            .map(actorId => {
                const actor =
                    actorLibrary.get(
                        actorId,
                    );
                return createActorNameField(
                    actorId,
                    actor?.nameEn ||
                        actorId,
                );
            });
        const actorRoleFields = [
            ...new Set(
                segments
                    .filter(segment =>
                        segment.type ===
                            'dialogue' &&
                        segment.actorId)
                    .map(segment =>
                        segment.actorId),
            ),
        ].filter(actorId => actorLibrary.has(actorId) && !collisions.has(actorId)).map(actorId => {
            const actor =
                actorLibrary.get(
                    actorId,
                );
            return createActorRoleField(
                actorId,
                actor?.roleEn ||
                    '',
            );
        });
        const itemCandidates =
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
                ?.itemCandidates ||
            [];
        const spellCandidates =
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
                ?.spellCandidates ||
            [];
        const spellFieldsByKey =
            new Map(
                spellCandidates.map(
                    candidate => [
                        candidate.key,
                        createSpellLocalizationFields(
                            candidate
                                .definition,
                        ),
                    ],
                ),
            );
        void Promise.resolve(
            ensureLocalizedFields(
                [
                    ...localizationFields,
                    ...actorNameFields,
                    ...actorRoleFields,
                    ...(message.extra?.hogwartsMud?.speakers || []).map(speaker => ({
                        recordKind: 'message_speaker',
                        recordId: `message:${messageId}:speaker:${speaker.id}`,
                        fieldPath: 'displayNameEn',
                        sourceTextEn: speaker.displayNameEn,
                    })),
                    authorQuillField,
                    ...itemCandidates
                        .flatMap(candidate =>
                            getVisibleItemLocalizationFields(
                                candidate.item,
                            )),
                    ...[
                        ...spellFieldsByKey
                            .values(),
                    ].flatMap(fields =>
                        fields),
                ],
                {
                    priority:
                        readOnly
                            ? 3
                            : 0,
                },
            ),
        ).catch(error =>
            console.warn(
                '[Hogwarts MUD] Visible message localization query failed',
                error,
            ));
        article.append(
            createMessageTranslationControl(
                article,
                message,
                messageId,
                {
                    readOnly,
                },
            ),
        );
        const quillCard = renderAuthorQuillCard(
            {
                authorQuill:
                    getLocalizedField(
                        authorQuillField,
                    ).text,
                authorQuillEn,
            },
            message,
        );
        if (quillCard) {
            article.append(quillCard);
        }
        segments.forEach((
            segment,
            index,
        ) => {
            const block = document.createElement(segment.type === 'dialogue' ? 'section' : 'div');
            block.className = `hpmud-scene-segment ${segment.type}`;
            if (segment.type === 'dialogue') {
                const actor = collisions.has(segment.actorId) ? null : actorLibrary.get(segment.actorId);
                const declaration = collisions.has(segment.actorId) ? null : (message.extra?.hogwartsMud?.speakers || [])
                    .find(speaker => speaker.id === segment.actorId);
                const localName = declaration ? getLocalizedField({
                    recordKind: 'message_speaker',
                    recordId: `message:${messageId}:speaker:${declaration.id}`,
                    fieldPath: 'displayNameEn',
                    sourceTextEn: declaration.displayNameEn,
                }) : null;
                const displayName = actor ? getActorDisplayName({
                    actorId: segment.actorId,
                    nameEn: actor.nameEn,
                    displayLocale: session.displayLocale,
                    getLocalizedField,
                }) : localName && (session.displayLocale === 'en' || localName.status === 'translated')
                    ? localName.text || staticText('ui.message.unresolved_speaker', 'Unidentified speaker')
                    : staticText('ui.message.unresolved_speaker', 'Unidentified speaker');
                const header = document.createElement('header');
                header.innerHTML = `
                <span class="hpmud-turn-avatar">${initials(displayName)}</span>
                <span class="hpmud-turn-name"><strong></strong><small></small></span>
            `;
                header.querySelector('strong').textContent = displayName;
                header.querySelector('small').textContent =
                    (actor ? getLocalizedField(
                        createActorRoleField(
                            segment.actorId,
                            actor?.roleEn ||
                                '',
                        ),
                    ).text : '') ||
                    staticText(
                        'ui.message.present_actor',
                        'Present actor',
                    );
                block.append(header);
            }
            const body = document.createElement('div');
            body.className = 'hpmud-scene-segment-body';
            const translated = document.createElement('div');
            translated.className = 'hpmud-translation';
            const sourceText =
                segment.textEn ||
                segment.rawText ||
                '';
            const localized =
                getLocalizedField(
                    localizationFields[
                        index
                    ],
                );
            const displayText =
                localized.text;
            translated.innerHTML = formatMessageText(
                message,
                displayText,
            );
            body.append(translated);
            if (
                session.displayLocale ===
                    'zh-CN' &&
                [
                    'pending',
                    'error',
                ].includes(
                    localized.status,
                )
            ) {
                const status =
                    document.createElement(
                        'small',
                    );
                status.className =
                    `hpmud-localization-status is-${localized.status}`;
                status.textContent =
                    getLocalizedField({
                        staticKey:
                            `translation.status.${localized.status}`,
                        sourceTextEn:
                            localized.status ===
                                'pending'
                                ? 'Translating'
                                : 'Translation unavailable',
                    }).text;
                body.append(status);
            }
            if (
                localized.status ===
                    'translated' &&
                displayText !==
                    sourceText
            ) {
                const original = document.createElement('div');
                original.className = 'hpmud-original';
                original.innerHTML =
                    formatMessageText(
                        message,
                        sourceText,
                    );
                body.append(original);
            }
            block.append(body);
            article.append(block);
        });
        itemCandidates
            .forEach(candidate => {
                const projectedItem =
                    projectItemCard(
                        candidate.item,
                        state,
                        session
                            .displayLocale,
                        {
                            getLocalizedField,
                            getRoomName,
                        },
                    );
                const item =
                    localizeItemCard(
                        projectedItem,
                        candidate.item,
                        getLocalizedField,
                    );
                const decision =
                    getItemProposalDecision(
                        state,
                        candidate.key,
                    ) ||
                    'pending';
                article.append(
                    createItemCandidateCard(
                        candidate,
                        item,
                        {
                            decision,
                            disabled:
                                isSaveRevisionBlocked(),
                            readOnly,
                            onAccept:
                                acceptItemCandidate,
                            onIgnore:
                                ignoreItemCandidate,
                            displayLocale:
                                session
                                    .displayLocale,
                        },
                    ),
                );
            });
        spellCandidates
            .forEach(candidate => {
                const fields =
                    spellFieldsByKey
                        .get(
                            candidate.key,
                        );
                const localizedCandidate = {
                    ...candidate,
                    definition: {
                        ...candidate
                            .definition,
                        name:
                            getLocalizedField(
                                fields[0],
                            ).text,
                        effect:
                            getLocalizedField(
                                fields[1],
                            ).text,
                    },
                };
                const decision =
                    getSpellProposalDecision(
                        state,
                        candidate.key,
                    ) ||
                    'pending';
                article.append(
                    createSpellCandidateCard(
                        localizedCandidate,
                        {
                            decision,
                            disabled:
                                isSaveRevisionBlocked(),
                            readOnly,
                            onAccept:
                                acceptSpellCandidate,
                            onIgnore:
                                ignoreSpellCandidate,
                            displayLocale:
                                session
                                    .displayLocale,
                        },
                    ),
                );
            });
        return article;
    }

    function createGenerationStatusCard({
        tier = 'low',
        eyebrow = 'LIVE GENERATION',
        title,
        detail,
        steps = [],
        activeStep = 0,
    }) {
        const article = document.createElement('article');
        article.className =
            `hpmud-generation-card tier-${tier}`;
        article.setAttribute('role', 'status');
        article.setAttribute('aria-live', 'polite');

        const seal = document.createElement('div');
        seal.className = 'hpmud-generation-seal';
        seal.innerHTML =
            '<i></i><i></i><span>H</span>';

        const copy = document.createElement('div');
        copy.className = 'hpmud-generation-copy';
        const small = document.createElement('small');
        const strong = document.createElement('strong');
        const paragraph = document.createElement('p');
        small.textContent = eyebrow;
        strong.textContent = title;
        paragraph.textContent = detail;
        copy.append(small, strong, paragraph);

        const rail = document.createElement('div');
        rail.className = 'hpmud-generation-rail';
        rail.append(document.createElement('span'));

        const stepList = document.createElement('div');
        stepList.className = 'hpmud-generation-steps';
        steps.forEach((step, index) => {
            const item = document.createElement('span');
            item.textContent = step;
            item.classList.toggle('done', index < activeStep);
            item.classList.toggle('active', index === activeStep);
            stepList.append(item);
        });
        article.append(seal, copy, rail, stepList);
        return article;
    }

    function renderLiveSceneStream() {
        const phase = session.liveSceneStream?.phase || 'connecting';
        const detailByPhase = {
            connecting:
                staticText(
                    'ui.message.stream.detail.connecting',
                    'Reading the player action, live facts, and Director instructions.',
                ),
            receiving:
                staticText(
                    'ui.message.stream.detail.receiving',
                    'Generating the complete reply. Text appears only after validation and commit.',
                ),
            repairing:
                staticText(
                    'ui.message.stream.detail.repairing',
                    'The draft failed structural validation and is being reorganized before final commit.',
                ),
            translating:
                staticText(
                    'ui.message.stream.detail.translating',
                    'Generating the Chinese display while this turn continues settling in the background.',
                ),
            committing:
                staticText(
                    'ui.message.stream.detail.committing',
                    'The narrative is readable. Finishing this turn proposal and world State commit.',
                ),
        };
        return createGenerationStatusCard({
            tier: 'low',
            eyebrow:
                'ON-SCENE PERFORMER · ATOMIC',
            title:
                staticText(
                    `ui.message.stream.phase.${phase}`,
                    LIVE_STREAM_PHASE_LABELS[
                        phase
                    ] ||
                    'Generating complete reply',
                ),
            detail:
                detailByPhase[phase] ||
                detailByPhase.receiving,
            steps: [
                staticText(
                    'ui.message.stream.step.read',
                    'Read action',
                ),
                staticText(
                    'ui.message.stream.step.generate',
                    'Generate complete reply',
                ),
                staticText(
                    'ui.message.stream.step.translate',
                    'Prepare display translation',
                ),
                staticText(
                    'ui.message.stream.step.commit',
                    'Commit State',
                ),
            ],
            activeStep:
                phase === 'connecting'
                    ? 0
                    : phase ===
                            'receiving' ||
                        phase ===
                            'repairing'
                        ? 1
                        : phase ===
                              'translating'
                            ? 2
                            : 3,
        });
    }

    function renderMessage(
        message,
        messageId,
        {
            readOnly = false,
        } = {},
    ) {
        if (message.is_system) {
            const system = document.createElement('article');
            system.className = 'hpmud-system-turn';
            const field = {
                recordKind:
                    'system_message',
                recordId:
                    String(messageId),
                fieldPath: 'mes',
                sourceTextEn:
                    message.mes ||
                    '',
            };
            void Promise.resolve(
                ensureLocalizedFields(
                    [
                        field,
                    ],
                    {
                        priority:
                            readOnly
                                ? 3
                                : 0,
                    },
                ),
            ).catch(() => {});
            system.innerHTML =
                formatMessageText(
                    message,
                    getLocalizedField(
                        field,
                    ).text,
                );
            return system;
        }

        const segments = message.extra?.hogwartsMud?.segments;
        if (!message.is_user && Array.isArray(segments) && segments.length) {
            return renderSegmentedMessage(
                message,
                messageId,
                segments,
                {
                    readOnly,
                },
            );
        }

        const article = document.createElement('article');
        article.className = `hpmud-turn ${message.is_user ? 'user' : 'assistant'}`;
        article.dataset.messageId = String(messageId);

        let header = null;
        if (message.is_user) {
            const playerName =
                getWorldState()
                    ?.character
                    ?.inputEvidence
                    ?.identity
                    ?.name ||
                message.name ||
                '';
            const playerNameField =
                createCharacterInputLocalizationField(
                    'identity.name',
                    playerName,
                );
            void Promise.resolve(
                ensureLocalizedFields(
                    [
                        playerNameField,
                    ],
                    {
                        priority:
                            readOnly
                                ? 3
                                : 1,
                    },
                ),
            ).catch(() => {});
            const displayName =
                getLocalizedField(
                    playerNameField,
                ).text ||
                staticText(
                    'ui.dossier.you',
                    'You',
                );
            header = document.createElement('header');
            header.className = 'hpmud-turn-header';
            header.innerHTML = `
            <span class="hpmud-turn-avatar">${initials(displayName)}</span>
            <span class="hpmud-turn-name"><strong></strong><small></small></span>
        `;
            header.querySelector('strong').textContent =
                displayName;
            header.querySelector('small').textContent =
                staticText(
                    'ui.message.your_turn',
                    'Your turn',
                );
        }

        const body = document.createElement('div');
        body.className = 'hpmud-turn-body';
        if (message.is_user) {
            body.textContent = message.mes;
        } else {
            const field = {
                recordKind:
                    'message',
                recordId:
                    String(messageId),
                fieldPath: 'mes',
                sourceTextEn:
                    message.mes ||
                    '',
            };
            void Promise.resolve(
                ensureLocalizedFields(
                    [
                        field,
                    ],
                    {
                        priority:
                            readOnly
                                ? 3
                                : 0,
                    },
                ),
            ).catch(() => {});
            article.append(
                createMessageTranslationControl(
                    article,
                    message,
                    messageId,
                    {
                        readOnly,
                    },
                ),
            );
            const translated = document.createElement('div');
            translated.className = 'hpmud-translation';
            translated.innerHTML =
                formatMessageText(
                    message,
                    getLocalizedField(
                        field,
                    ).text,
                );
            body.append(translated);
        }

        if (header) article.append(header);
        article.append(body);
        return article;
    }

    function getCurrentSceneMessageEntries(context, state) {
        if (!state.scene?.id) {
            const offset = Math.max(
                0,
                context.chat.length - MAX_RENDERED_MESSAGES,
            );
            return context.chat.slice(offset).map((message, index) => ({
                message,
                messageId: offset + index,
            }));
        }
        const archivedMessageIds = new Set(
            (state.sceneArchive || [])
                .flatMap(scene => scene.messageIds || []),
        );
        const start = Math.max(
            0,
            Number(state.scene.startedMessageId || 0),
        );
        const entries = context.chat
            .map((message, messageId) => ({ message, messageId }))
            .filter(({ message, messageId }) =>
                messageId >= start &&
                !archivedMessageIds.has(messageId) &&
                (!message.extra?.hogwartsMud?.sceneId ||
                    message.extra.hogwartsMud.sceneId === state.scene.id),
            );
        if (entries.length) {
            return entries;
        }
        return context.chat
            .map((message, messageId) => ({ message, messageId }))
            .filter(({ message }) =>
                message.extra?.hogwartsMud?.sceneId === state.scene.id,
            );
    }

    return {
        formatMessageText,
        renderCheckCard,
        renderAuthorQuillCard,
        getTranslationProviderLabel,
        createMessageTranslationControl,
        renderSegmentedMessage,
        createGenerationStatusCard,
        renderLiveSceneStream,
        renderMessage,
        getCurrentSceneMessageEntries,
    };
}

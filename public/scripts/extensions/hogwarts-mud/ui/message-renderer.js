import {
    createItemCandidateCard,
} from './item-components.js';

export function createMessageRenderer(ports) {
    const {
        session,
    } = ports;

    const {
        LIVE_STREAM_PHASE_LABELS,
        MAX_RENDERED_MESSAGES,
        acceptItemCandidate,
        getContext,
        getItemProposalDecision,
        getSettings,
        getWorldState,
        ignoreItemCandidate,
        initials,
        normalizeTranslationProvider,
        projectItemCard,
        translateMessage,
    } = ports;

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
        const targetText = check.target?.name
            ? `对抗 ${check.target.name} · 难度隐藏`
            : '环境难度隐藏';
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
                        ? `熟练修正 ${
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
                        )}`
                        : '未学咒语 · 实验难度',
                ].join(' · ')
                : check.spellObservation
                    ? observationSucceeded
                        ? [
                            check
                                .spellObservation
                                .incantation,
                            '主动观测',
                        ].join(' · ')
                        : '未能辨认咒语'
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
                live ? 'RULES RESOLVED · 续写中' : 'D20 CHECK · 本地判定',
                check.rollMode === 'advantage'
                    ? '优势'
                    : check.rollMode === 'disadvantage'
                        ? '劣势'
                        : '',
            ].filter(Boolean).join(' · ');
        card.querySelector('.hpmud-check-copy strong')
            .textContent = `${check.label} · ${check.outcomeLabel}`;
        card.querySelector('.hpmud-check-copy span')
            .textContent = [
                spellText,
                `${check.attributeLabel} ${rolls} ${modifierText} = ${check.total}`,
                targetText,
            ].filter(Boolean).join(' · ');
        card.querySelector('.hpmud-check-total small')
            .textContent = '总值';
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
                <strong>作者的羽毛笔</strong>
            </span>
            <b>本章批注</b>
        </header>
        <p class="hpmud-quill-disclaimer">不计入角色认知 · 不含剧透 · 编辑部拒绝承担玩家策略造成的家具损失</p>
        <div class="hpmud-quill-copy"></div>
    `;
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
        return {
            local: '本地 4B',
            google: 'Google',
            bing: 'Bing',
            off: '不开',
        }[
            normalizeTranslationProvider(
                provider,
            )
        ];
    }

    function createMessageTranslationControl(
        article,
        message,
        messageId,
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
        summary.textContent = 'EN';
        summary.title =
            '切换语言或重新翻译';

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
            `当前：${getTranslationProviderLabel(
                translation.provider ||
                getSettings()
                    .translationProvider,
            )}` +
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
            '显示中文译文';
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
            '显示英文原文';
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
                        ? '中'
                        : 'EN';
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
            `重新翻译 · ${getTranslationProviderLabel(
                getSettings()
                    .translationProvider,
            )}`;
        retranslate.disabled =
            Number(messageId) < 0;
        retranslate.addEventListener(
            'click',
            async () => {
                retranslate.disabled =
                    true;
                status.textContent =
                    '正在重新翻译…';
                await translateMessage(
                    Number(messageId),
                    {
                        force: true,
                    },
                );
                if (
                    status
                        .isConnected
                ) {
                    status.textContent =
                        '已重新翻译';
                    retranslate.disabled =
                        false;
                    setOriginal(false);
                }
            },
        );
        menu.append(
            status,
            chinese,
            english,
            retranslate,
        );
        details.append(
            summary,
            menu,
        );
        return details;
    }

    function renderSegmentedMessage(message, messageId, segments) {
        const state = getWorldState();
        const actorLibrary = new Map([
            ...(state.actorLibrary || []),
            ...(state.actors || []),
        ].map(actor => [
            actor.id,
            actor,
        ]));
        const article = document.createElement('article');
        article.className = 'hpmud-scene-turn';
        article.dataset.messageId = String(messageId);
        const authorQuill =
            message.extra?.hogwartsMud?.authorQuill;
        const authorQuillEn =
            message.extra?.hogwartsMud?.authorQuillEn;
        const hasTranslation =
            segments.some(segment => segment.textZh) ||
            Boolean(
                authorQuill &&
                authorQuillEn &&
                authorQuill !== authorQuillEn,
            );
        const check = message.extra?.hogwartsMud
            ?.turnTransaction?.checkResolution;
        if (check) {
            article.append(renderCheckCard(check));
        }

        if (hasTranslation) {
            article.append(
                createMessageTranslationControl(
                    article,
                    message,
                    messageId,
                ),
            );
        }

        const quillCard = renderAuthorQuillCard(
            {
                authorQuill,
                authorQuillEn,
            },
            message,
        );
        if (quillCard) {
            article.append(quillCard);
        }

        segments.forEach(segment => {
            const block = document.createElement(segment.type === 'dialogue' ? 'section' : 'div');
            block.className = `hpmud-scene-segment ${segment.type}`;
            if (segment.type === 'dialogue') {
                const actor = actorLibrary.get(segment.actorId);
                const displayName =
                    actor?.name ||
                    actor?.display?.name ||
                    actor?.nameEn ||
                    segment.actorId;
                const header = document.createElement('header');
                header.innerHTML = `
                <span class="hpmud-turn-avatar">${initials(displayName)}</span>
                <span class="hpmud-turn-name"><strong></strong><small></small></span>
            `;
                header.querySelector('strong').textContent = displayName;
                header.querySelector('small').textContent = actor?.role || actor?.roleEn || '在场人物';
                block.append(header);
            }
            const body = document.createElement('div');
            body.className = 'hpmud-scene-segment-body';
            const translated = document.createElement('div');
            translated.className = 'hpmud-translation';
            translated.innerHTML = formatMessageText(message, segment.textZh || segment.textEn);
            body.append(translated);
            if (segment.textZh) {
                const original = document.createElement('div');
                original.className = 'hpmud-original';
                original.innerHTML = formatMessageText(message, segment.textEn);
                body.append(original);
            }
            block.append(body);
            article.append(block);
        });
        const itemCandidates =
            message.extra
                ?.hogwartsMud
                ?.turnTransaction
                ?.itemCandidates ||
            [];
        itemCandidates
            .forEach(candidate => {
                const item =
                    projectItemCard(
                        candidate.item,
                        state,
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
                            onAccept:
                                acceptItemCandidate,
                            onIgnore:
                                ignoreItemCandidate,
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
                '正在读取玩家行动、现场事实与导演指令。',
            receiving:
                '正在生成完整回复；正文将在校验并提交后一次显示。',
            repairing:
                '初稿未通过结构校验，正在重新整理；正文只在最终提交后显示。',
            translating:
                '完整原稿已通过结构校验，正在翻译并准备提交。',
            committing:
                '正在提交世界状态与最终消息。',
        };
        return createGenerationStatusCard({
            tier: 'low',
            eyebrow:
                'ON-SCENE PERFORMER · ATOMIC',
            title:
                LIVE_STREAM_PHASE_LABELS[
                    phase
                ] ||
                '正在生成完整回复',
            detail:
                detailByPhase[phase] ||
                detailByPhase.receiving,
            steps: [
                '读取行动',
                '生成完整回复',
                '译入中文',
                '提交状态',
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

    function renderMessage(message, messageId) {
        if (message.is_system) {
            const system = document.createElement('article');
            system.className = 'hpmud-system-turn';
            system.innerHTML = formatMessageText(message, message.mes);
            return system;
        }

        const segments = message.extra?.hogwartsMud?.segments;
        if (!message.is_user && Array.isArray(segments) && segments.length) {
            return renderSegmentedMessage(message, messageId, segments);
        }

        const translationEnabled = getSettings().translationEnabled;
        const translation = translationEnabled ? message.extra?.hogwartsMud : null;
        const article = document.createElement('article');
        article.className = `hpmud-turn ${message.is_user ? 'user' : 'assistant'}`;
        article.dataset.messageId = String(messageId);

        let header = null;
        if (message.is_user) {
            header = document.createElement('header');
            header.className = 'hpmud-turn-header';
            header.innerHTML = `
            <span class="hpmud-turn-avatar">${initials(message.name)}</span>
            <span class="hpmud-turn-name"><strong></strong><small></small></span>
        `;
            header.querySelector('strong').textContent = message.name || 'You';
            header.querySelector('small').textContent = '你的回合';
        } else if (translation?.translatedZh) {
            article.classList.add('hpmud-manuscript');
            article.append(
                createMessageTranslationControl(
                    article,
                    message,
                    messageId,
                ),
            );
        }

        const body = document.createElement('div');
        body.className = 'hpmud-turn-body';
        if (message.is_user) {
            body.textContent = message.mes;
        } else {
            const translated = document.createElement('div');
            translated.className = 'hpmud-translation';
            translated.innerHTML = formatMessageText(message, translation?.translatedZh || message.mes);
            body.append(translated);

            if (translation?.translatedZh) {
                const original = document.createElement('div');
                original.className = 'hpmud-original';
                original.innerHTML = formatMessageText(message, translation.sourceEn || message.mes);
                body.append(original);
            }
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

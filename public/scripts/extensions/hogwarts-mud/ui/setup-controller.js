export const SETUP_STEPS =
    Object.freeze([
        'identity',
        'background',
        'aptitudes',
        'story',
        'models',
        'review',
    ]);

const CHARACTER_CODE_STATIC_KEYS =
    Object.freeze({
        muggle_born:
            'ui.setup.background.muggle_born',
        half_blood:
            'ui.setup.background.half_blood',
        pure_blood:
            'ui.setup.background.pure_blood',
        unknown_complex:
            'ui.setup.background.complex',
        charms:
            'ui.setup.domain.charms',
        transfiguration:
            'ui.setup.domain.transfiguration',
        potions:
            'ui.setup.domain.potions',
        herbology:
            'ui.setup.domain.herbology',
        flying:
            'ui.setup.domain.flying',
        mind:
            'ui.setup.domain.mind',
        defence:
            'ui.setup.domain.defence',
        none:
            'ui.setup.talent.none',
        parseltongue:
            'ui.setup.talent.parseltongue',
        metamorphmagus_tendency:
            'ui.setup.talent.metamorphmagus',
        divination_tendency:
            'ui.setup.talent.prophecy',
        custom_in_background:
            'ui.setup.talent.custom',
        balanced:
            'ui.setup.aptitude.balanced',
        volatile:
            'ui.setup.aptitude.volatile',
        patient:
            'ui.setup.aptitude.patient',
        focused:
            'ui.setup.aptitude.focused',
    });

export function createSetupController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        LOCAL_MAP_CATALOG,
        RESPONSE_HEADROOM_VERSION,
        applyNativeRoleSettings,
        applySystemPrompt,
        assertSaveRevisionWritable =
        () => {},
        createDefaultCharacterDraft,
        createInitialWorldState,
        getContext,
        getCharacterInputDraft,
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
        getMudState,
        getPresetLocalMap,
        getSettings,
        initializeNewTimelineState =
        state => state,
        initializeOpeningWorld,
        isGameStarted,
        normalizeCampaign,
        normalizeCharacterCode =
        value =>
            String(value || ''),
        normalizeCharacterV2,
        normalizeModelSlots,
        populateLevelSelect,
        populateMapScopeSelect,
        renderLocalMap,
        renderWorldMap,
        resolveRoleSlots,
        saveSettingsDebounced,
        sendCharacterPolishRequest,
        setAppScreen,
        syncModelSlotControls,
        validateCharacterDraft,
    } = ports;

    const {
        root,
        setupForm,
    } = refs;

    function getSetupControl(name) {
        return setupForm.elements.namedItem(name);
    }

    function campaignName(
        campaign,
    ) {
        return getLocalizedField({
            staticKey:
                `campaign.${campaign.presetId}.name`,
            sourceTextEn:
                campaign.presetId,
        }).text;
    }

    function difficultyName(
        campaign,
    ) {
        return getLocalizedField({
            staticKey:
                `difficulty.${campaign.difficulty}.name`,
            sourceTextEn:
                campaign.difficulty,
        }).text;
    }

    function staticText(
        staticKey,
        sourceTextEn,
    ) {
        return getLocalizedField({
            staticKey,
            sourceTextEn,
        }).text ||
            sourceTextEn;
    }

    function characterCodeText(
        value,
    ) {
        const code =
            normalizeCharacterCode(
                value,
            );
        const staticKey =
            CHARACTER_CODE_STATIC_KEYS[
                code
            ];
        return staticKey
            ? staticText(
                staticKey,
                code,
            )
            : String(value || '');
    }

    function setControlValue(name, value) {
        const control = getSetupControl(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
            control.value = String(value ?? '');
        }
    }

    function collectCharacterDraft() {
        return {
            identity: {
                name: String(getSetupControl('character_name')?.value || '').trim(),
                pronouns: String(getSetupControl('character_pronouns')?.value || '').trim(),
                age: Number(getSetupControl('character_age')?.value || 11),
                appearance: String(getSetupControl('character_appearance')?.value || '').trim(),
            },
            background: {
                bloodStatus: String(getSetupControl('blood_status')?.value || '').trim(),
                guardian: String(getSetupControl('guardian')?.value || '').trim(),
                home: String(getSetupControl('home')?.value || '').trim(),
                economy: String(getSetupControl('economy')?.value || '').trim(),
                desire: String(getSetupControl('desire')?.value || '').trim(),
                fear: String(getSetupControl('fear')?.value || '').trim(),
                habit: String(getSetupControl('habit')?.value || '').trim(),
                formativeEvent: String(getSetupControl('formative_event')?.value || '').trim(),
            },
            aptitudes: {
                learning: String(getSetupControl('learning')?.value || '').trim(),
                physical: String(getSetupControl('physical')?.value || '').trim(),
                observation: String(getSetupControl('observation')?.value || '').trim(),
                social: String(getSetupControl('social')?.value || '').trim(),
                pressure: String(getSetupControl('pressure')?.value || '').trim(),
                magicalPotential: String(getSetupControl('magical_potential')?.value || 'balanced'),
                strongDomain: String(getSetupControl('strong_domain')?.value || '').trim(),
                weakDomain: String(getSetupControl('weak_domain')?.value || '').trim(),
                rareTalent: String(getSetupControl('rare_talent')?.value || 'none'),
            },
            attributes: {
                physique: Number(getSetupControl('attr_physique')?.value),
                agility: Number(getSetupControl('attr_agility')?.value),
                perception: Number(getSetupControl('attr_perception')?.value),
                intellect: Number(getSetupControl('attr_intellect')?.value),
                willpower: Number(getSetupControl('attr_willpower')?.value),
                charisma: Number(getSetupControl('attr_charisma')?.value),
            },
            polishedBackground: root.querySelector('#hpmud_polished_background').value.trim(),
            confirmed: false,
        };
    }

    function loadSetupDraft() {
        const settings = getSettings();
        const draft = isGameStarted()
            ? getCharacterInputDraft(
                getMudState()
                    .character,
            )
            : structuredClone(settings.setupDraft || createDefaultCharacterDraft());
        const values = {
            character_name: draft.identity?.name,
            character_pronouns: draft.identity?.pronouns,
            character_age: draft.identity?.age ?? 11,
            character_appearance: draft.identity?.appearance,
            blood_status:
                normalizeCharacterCode(
                    draft.background
                        ?.bloodStatus,
                ),
            guardian: draft.background?.guardian,
            home: draft.background?.home,
            economy: draft.background?.economy,
            desire: draft.background?.desire,
            fear: draft.background?.fear,
            habit: draft.background?.habit,
            formative_event: draft.background?.formativeEvent,
            learning: draft.aptitudes?.learning,
            physical: draft.aptitudes?.physical,
            observation: draft.aptitudes?.observation,
            social: draft.aptitudes?.social,
            pressure: draft.aptitudes?.pressure,
            magical_potential: draft.aptitudes?.magicalPotential,
            strong_domain:
                normalizeCharacterCode(
                    draft.aptitudes
                        ?.strongDomain,
                ),
            weak_domain:
                normalizeCharacterCode(
                    draft.aptitudes
                        ?.weakDomain,
                ),
            rare_talent:
                normalizeCharacterCode(
                    draft.aptitudes
                        ?.rareTalent,
                ) ||
                'none',
            attr_physique: draft.attributes?.physique,
            attr_agility: draft.attributes?.agility,
            attr_perception: draft.attributes?.perception,
            attr_intellect: draft.attributes?.intellect,
            attr_willpower: draft.attributes?.willpower,
            attr_charisma: draft.attributes?.charisma,
        };
        Object.entries(values).forEach(([name, value]) => setControlValue(name, value));
        root.querySelector('#hpmud_polished_background').value = draft.polishedBackground || '';
        const campaign = normalizeCampaign(isGameStarted()
            ? getMudState().campaign
            : settings.campaignDraft);
        root.querySelector('#hpmud_setup_campaign_note').textContent =
            session.displayLocale ===
                'en'
                ? `${campaignName(campaign)} · ${campaign.startYear} · Grade ${campaign.grade} · ${difficultyName(campaign)}. Sorting remains a story outcome.`
                : `${campaignName(campaign)} · ${campaign.startYear} 年 · ${campaign.grade} 年级 · ${difficultyName(campaign)}难度。分院结果仍在故事中产生。`;
        syncModelSlotControls();
        updateAttributeTotal();
    }

    function saveSetupDraft() {
        if (isGameStarted()) {
            return;
        }
        getSettings().setupDraft = collectCharacterDraft();
        saveSettingsDebounced();
    }

    function collectModelSlots() {
        const slots = {};
        for (const role of ['low', 'medium', 'high']) {
            slots[role] = {
                profileId: String(getSetupControl(`profile_${role}`)?.value || ''),
                presetName: String(getSetupControl(`preset_${role}`)?.value || ''),
                regexPresetId: String(getSetupControl(`regex_${role}`)?.value || ''),
                contextSize: Number(getSetupControl(`context_${role}`)?.value),
                maxResponseLength: Number(getSetupControl(`response_${role}`)?.value),
                responseHeadroomVersion:
                    RESPONSE_HEADROOM_VERSION,
            };
        }
        return normalizeModelSlots(slots);
    }

    function updateAttributeTotal() {
        const names = ['attr_physique', 'attr_agility', 'attr_perception', 'attr_intellect', 'attr_willpower', 'attr_charisma'];
        const total = names.reduce((sum, name) => sum + Number(getSetupControl(name)?.value || 0), 0);
        const output = root.querySelector('#hpmud_attribute_total');
        output.textContent = String(total);
        output.closest('b').classList.toggle('invalid', total !== 63);
    }

    function showSetupStep(step) {
        const steps =
            SETUP_STEPS;
        const index = Math.max(0, steps.indexOf(step));
        session.activeSetupStep = steps[index];
        const copy = {
            identity: [
                'ui.setup.identity.kicker',
                'ui.setup.identity.title',
                'Volume One · Identity',
                'Decide who will receive the letter',
            ],
            background: [
                'ui.setup.background.kicker',
                'ui.setup.background.title',
                'Volume Two · Family and Desire',
                'Tell the world where you come from',
            ],
            aptitudes: [
                'ui.setup.aptitudes.kicker',
                'ui.setup.aptitudes.title',
                'Volume Three · Aptitudes',
                'Strengths and weaknesses must both hold',
            ],
            story: [
                'ui.setup.story.kicker',
                'ui.setup.story.title',
                'Volume Four · Story Preferences',
                'Choose the relationships and pacing you want to explore',
            ],
            models: [
                'ui.setup.models.kicker',
                'ui.setup.models.title',
                'Volume Five · Generation Settings',
                'Assign each responsibility to the right model',
            ],
            review: [
                'ui.setup.review.kicker',
                'ui.setup.review.title',
                'Volume Six · Fact Confirmation',
                'The world begins after you confirm the character sheet',
            ],
        };
        root.querySelectorAll('[data-hpmud-step]').forEach(button => button.classList.toggle('active', button.dataset.hpmudStep === session.activeSetupStep));
        root.querySelectorAll('[data-hpmud-page]').forEach(page => {
            const visible = page.dataset.hpmudPage === session.activeSetupStep;
            page.hidden = !visible;
            page.classList.toggle('active', visible);
        });
        const activeCopy =
            copy[
                session.activeSetupStep
            ];
        root.querySelector('#hpmud_setup_kicker').textContent =
            staticText(
                activeCopy[0],
                activeCopy[2],
            );
        root.querySelector('#hpmud_setup_title').textContent =
            staticText(
                activeCopy[1],
                activeCopy[3],
            );
        root.querySelector('#hpmud_setup_progress').textContent = `${index + 1} / ${steps.length}`;
        root.querySelector('#hpmud_setup_previous').disabled = index === 0;
        root.querySelector('#hpmud_setup_next').hidden = index === steps.length - 1;
        root.querySelector('#hpmud_start_game').hidden = index !== steps.length - 1;
        root.querySelector('#hpmud_start_game').textContent =
            isGameStarted()
                ? staticText(
                    'ui.setup.save_return',
                    'Save and return to game',
                )
                : staticText(
                    'ui.setup.start',
                    'Confirm character and begin',
                );
        root.querySelector(
            '#hpmud_setup_return_game',
        ).hidden = !isGameStarted();
        if (session.activeSetupStep === 'review') {
            renderSetupReview();
        }
    }

    function buildLocalBackground(character) {
        const identity = character.identity;
        const background = character.background;
        const aptitude = character.aptitudes;
        const potential =
            characterCodeText(
                aptitude
                    .magicalPotential,
            );
        const strong =
            characterCodeText(
                aptitude
                    .strongDomain,
            );
        const weak =
            characterCodeText(
                aptitude
                    .weakDomain,
            );
        if (
            session.displayLocale ===
            'en'
        ) {
            return `${identity.name || 'This student'} grew up in ${background.home || 'Britain'} under the care of ${background.guardian || 'their family'}. ${identity.appearance || ''}\n\n${identity.name || 'This child'} most wants ${background.desire || 'something not yet spoken aloud'}, but fears ${background.fear || 'an unnamed loss'}. ${background.formativeEvent || ''}\n\nTheir magical potential is ${potential || 'balanced'}; likely strengths include ${strong || 'an undiscovered domain'}, while ${weak || 'a domain not yet tested in class'} remains difficult.`;
        }
        return `${identity.name || '这名新生'}在${background.home || '英国'}长大，由${background.guardian || '家人'}照料。${identity.appearance || ''}\n\n${identity.name || '这个孩子'}最想得到的是${background.desire || '尚未说出口的东西'}，却害怕${background.fear || '某种尚未命名的失去'}。${background.formativeEvent || ''}\n\n魔法能力呈现“${potential || '均衡'}”倾向，优势可能在${strong || '尚待发现的领域'}，短板则是${weak || '尚待课堂验证的领域'}。`;
    }

    function renderSetupMap() {
        const scopeSelect = root.querySelector('#hpmud_setup_map_scope');
        const levelSelect = root.querySelector('#hpmud_setup_map_level');
        populateMapScopeSelect(scopeSelect, session.setupMapScope);
        session.setupMapScope = scopeSelect.value;
        const container = root.querySelector('#hpmud_setup_map');
        const stats = root.querySelector('#hpmud_review_map_stats');
        if (session.setupMapScope === 'world') {
            levelSelect.hidden = true;
            renderWorldMap(container, null, { revealAll: true });
            stats.textContent =
                `${LOCAL_MAP_CATALOG.length} ${staticText(
                    'ui.setup.review.maps',
                    'local maps',
                )} · ${LOCAL_MAP_CATALOG.reduce((sum, item) => sum + item.nodeCount, 0)} ${staticText(
                    'ui.setup.review.fixed_nodes',
                    'fixed nodes',
                )}`;
            return;
        }
        session.setupMapLevel = populateLevelSelect(levelSelect, session.setupMapScope, session.setupMapLevel);
        const model = renderLocalMap(container, session.setupMapScope, {}, {
            levelId: session.setupMapLevel,
            revealAll: true,
        });
        stats.textContent =
            `${model?.levels.length || 0} ${staticText(
                'ui.setup.review.levels',
                'levels',
            )} · ${getPresetLocalMap(session.setupMapScope)?.nodes.length || 0} ${staticText(
                'ui.setup.review.fixed_nodes',
                'fixed nodes',
            )}`;
    }

    function renderSetupReview() {
        const character = collectCharacterDraft();
        const campaign = normalizeCampaign(isGameStarted()
            ? getMudState().campaign
            : getSettings().campaignDraft);
        root.querySelector('#hpmud_review_name').textContent =
            character.identity.name ||
            staticText(
                'ui.setup.review.unnamed',
                'Unnamed',
            );
        root.querySelector('#hpmud_review_world_title').textContent =
            `${campaign.startYear} · ${campaignName(campaign)}`;
        const background = root.querySelector('#hpmud_polished_background');
        if (!background.value.trim()) {
            background.value = buildLocalBackground(character);
        }
        const facts = root.querySelector('#hpmud_review_facts');
        facts.replaceChildren();
        const bloodStatus =
            characterCodeText(
                character.background
                    .bloodStatus,
            );
        const strongDomain =
            characterCodeText(
                character.aptitudes
                    .strongDomain,
            );
        const rareTalent =
            characterCodeText(
                character.aptitudes
                    .rareTalent,
            );
        [
            staticText(
                `ui.grade.${campaign.grade}`,
                `Year ${campaign.grade}`,
            ),
            session.displayLocale ===
                'en'
                ? `${difficultyName(campaign)} difficulty`
                : `${difficultyName(campaign)}难度`,
            bloodStatus ||
                staticText(
                    'ui.setup.review.blood_pending',
                    'Blood status undecided',
                ),
            strongDomain
                ? `${staticText(
                    'ui.setup.review.strength',
                    'Strength',
                )}: ${strongDomain}`
                : staticText(
                    'ui.setup.review.strength_pending',
                    'Strength undiscovered',
                ),
            rareTalent ||
                staticText(
                    'ui.setup.talent.none',
                    'No known rare talent',
                ),
        ].forEach(value => {
            const item = document.createElement('span');
            item.textContent = value;
            facts.append(item);
        });
        renderSetupMap();
    }

    async function polishCharacterBackground() {
        const button = root.querySelector('#hpmud_polish_background');
        const character = collectCharacterDraft();
        delete character
            .polishedBackground;
        const slots = resolveRoleSlots(collectModelSlots());
        const profileId = slots.medium.profileId;
        if (!profileId) {
            toastr.warning(
                staticText(
                    'ui.setup.review.profile_required',
                    'Select a medium- or high-tier Connection Profile first.',
                ),
            );
            return;
        }
        button.disabled = true;
        button.textContent =
            staticText(
                'ui.setup.review.polishing',
                'Polishing...',
            );
        try {
            const campaign = normalizeCampaign(
                isGameStarted() ? getMudState().campaign : getSettings().campaignDraft,
            );
            const roleSlot = {
                ...slots.medium,
                profileId,
            };
            const response = await sendCharacterPolishRequest(roleSlot, [
                {
                    role: 'system',
                    content:
                        session.displayLocale ===
                            'zh-CN'
                            ? `你负责润色一份霍格沃茨角色扮演游戏的结构化玩家人物背景。故事始于 ${campaign.startYear} 年，入学年级为 ${campaign.grade}。保留所有已提供事实，不得添加秘密血统或能力。使用自然的现代简体中文写 300–500 字，只输出正文，不得夹杂英文。`
                            : `You polish a structured player character background for a Hogwarts role-playing game beginning in ${campaign.startYear}, school grade ${campaign.grade}. Preserve every supplied fact, add no secret lineage or ability, write 180-260 English words, and output prose only.`,
                },
                { role: 'user', content: JSON.stringify(character) },
            ]);
            const content = String(response?.content || '').trim();
            if (!content) {
                throw new Error(
                    staticText(
                        'ui.setup.review.model_empty',
                        'The model returned no background text.',
                    ),
                );
            }
            root.querySelector('#hpmud_polished_background').value = content;
        } catch (error) {
            console.error('[Hogwarts MUD] Character polish failed', error);
            toastr.error(
                getLocalizedField({
                    staticKey:
                        'ui.setup.polish_failed',
                    sourceTextEn:
                        'Character background polishing failed.',
                }).text,
            );
        } finally {
            button.disabled = false;
            button.textContent =
                staticText(
                    'ui.setup.review.polish',
                    'Polish with medium-tier AI',
                );
        }
    }

    async function startGameFromSetup() {
        const wasStarted = isGameStarted();
        const character = collectCharacterDraft();
        const slots = collectModelSlots();
        const errors = validateCharacterDraft(character);
        if (!slots.low.profileId) {
            errors.push(
                staticText(
                    'ui.setup.validation.low_profile',
                    'Select a low-tier Scene Performer Connection Profile.',
                ),
            );
        }
        if (!root.querySelector('#hpmud_confirm_facts').checked) {
            errors.push(
                staticText(
                    'ui.setup.validation.confirm_facts',
                    'Confirm the character-sheet facts.',
                ),
            );
        }
        const errorElement = root.querySelector('#hpmud_setup_errors');
        errorElement.replaceChildren(...errors.map(error => Object.assign(document.createElement('p'), { textContent: error })));
        if (errors.length) {
            showSetupStep('review');
            return;
        }

        const settings = getSettings();
        const campaign = normalizeCampaign(wasStarted
            ? getMudState().campaign
            : settings.campaignDraft);
        settings.setupDraft = structuredClone(character);
        settings.modelSlots = structuredClone(slots);
        if (wasStarted) {
            assertSaveRevisionWritable();
        }
        await applyNativeRoleSettings(slots.low);

        const context = getContext();
        if (wasStarted) {
            context.chatMetadata.hogwartsMud.character = {
                ...normalizeCharacterV2({
                    ...character,
                    confirmed: true,
                }),
            };
            context.chatMetadata
                .hogwartsMud
                .characterLanguageVersion =
                context.chatMetadata
                    .hogwartsMud
                    .character.version;
            context.chatMetadata.hogwartsMud.modelSlots = structuredClone(slots);
        } else {
            context.chatMetadata.hogwartsMud =
                initializeNewTimelineState(
                    createInitialWorldState(
                        character,
                        slots,
                        campaign,
                    ),
                );
        }
        saveSettingsDebounced();
        await context.saveMetadata({
            source:
                wasStarted
                    ? 'setup_update'
                    : 'timeline_create',
        });
        applySystemPrompt();
        setAppScreen('game');
        if (wasStarted && getMudState().opening?.status === 'ready') {
            toastr.success(
                staticText(
                    'ui.setup.saved',
                    'Character sheet and model settings saved.',
                ),
            );
            return;
        }
        toastr.info(
            staticText(
                'ui.setup.confirmed',
                'Character sheet confirmed. The World Director is arranging your opening.',
            ),
        );
        await initializeOpeningWorld();
    }

    return {
        getSetupControl,
        setControlValue,
        collectCharacterDraft,
        loadSetupDraft,
        saveSetupDraft,
        collectModelSlots,
        updateAttributeTotal,
        showSetupStep,
        buildLocalBackground,
        renderSetupMap,
        renderSetupReview,
        polishCharacterBackground,
        startGameFromSetup,
    };
}

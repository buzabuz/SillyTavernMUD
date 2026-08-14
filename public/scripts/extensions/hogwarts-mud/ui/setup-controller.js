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
        getMudState,
        getPresetLocalMap,
        getSettings,
        initializeNewTimelineState =
        state => state,
        initializeOpeningWorld,
        isGameStarted,
        normalizeCampaign,
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
            ? structuredClone(getMudState().character)
            : structuredClone(settings.setupDraft || createDefaultCharacterDraft());
        const values = {
            character_name: draft.identity?.name,
            character_pronouns: draft.identity?.pronouns,
            character_age: draft.identity?.age ?? 11,
            character_appearance: draft.identity?.appearance,
            blood_status: draft.background?.bloodStatus,
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
            strong_domain: draft.aptitudes?.strongDomain,
            weak_domain: draft.aptitudes?.weakDomain,
            rare_talent: draft.aptitudes?.rareTalent,
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
            `${campaign.presetName} · ${campaign.startYear} 年 · ${campaign.grade} 年级 · ${campaign.difficultyName}难度。分院结果仍在故事中产生。`;
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
        const steps = ['identity', 'background', 'aptitudes', 'models', 'review'];
        const index = Math.max(0, steps.indexOf(step));
        session.activeSetupStep = steps[index];
        const copy = {
            identity: ['第一卷 · 身份记录', '先决定谁将收到那封信'],
            background: ['第二卷 · 家庭与欲望', '让世界知道你从哪里来'],
            aptitudes: ['第三卷 · 能力倾向', '长处必须与短板一起成立'],
            models: ['第四卷 · 生成配置', '把三种职责交给合适的模型'],
            review: ['第五卷 · 事实确认', '人物卡确认后，世界才开始转动'],
        };
        root.querySelectorAll('[data-hpmud-step]').forEach(button => button.classList.toggle('active', button.dataset.hpmudStep === session.activeSetupStep));
        root.querySelectorAll('[data-hpmud-page]').forEach(page => {
            const visible = page.dataset.hpmudPage === session.activeSetupStep;
            page.hidden = !visible;
            page.classList.toggle('active', visible);
        });
        root.querySelector('#hpmud_setup_kicker').textContent = copy[session.activeSetupStep][0];
        root.querySelector('#hpmud_setup_title').textContent = copy[session.activeSetupStep][1];
        root.querySelector('#hpmud_setup_progress').textContent = `${index + 1} / ${steps.length}`;
        root.querySelector('#hpmud_setup_previous').disabled = index === 0;
        root.querySelector('#hpmud_setup_next').hidden = index === steps.length - 1;
        root.querySelector('#hpmud_start_game').hidden = index !== steps.length - 1;
        root.querySelector('#hpmud_start_game').textContent = isGameStarted() ? '保存并返回游戏' : '确认人物卡并开始';
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
        return `${identity.name || '这名新生'}在${background.home || '英国'}长大，由${background.guardian || '家人'}照料。${identity.appearance || ''}\n\n${identity.name || '这个孩子'}最想得到的是${background.desire || '尚未说出口的东西'}，却害怕${background.fear || '某种尚未命名的失去'}。${background.formativeEvent || ''}\n\n魔法能力呈现“${aptitude.magicalPotential || '均衡'}”倾向，优势可能在${aptitude.strongDomain || '尚待发现的领域'}，短板则是${aptitude.weakDomain || '尚待课堂验证的领域'}。`;
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
            stats.textContent = `${LOCAL_MAP_CATALOG.length} 个小地图 · ${LOCAL_MAP_CATALOG.reduce((sum, item) => sum + item.nodeCount, 0)} 个固定节点`;
            return;
        }
        session.setupMapLevel = populateLevelSelect(levelSelect, session.setupMapScope, session.setupMapLevel);
        const model = renderLocalMap(container, session.setupMapScope, {}, {
            levelId: session.setupMapLevel,
            revealAll: true,
        });
        stats.textContent = `${model?.levels.length || 0} 层 · ${getPresetLocalMap(session.setupMapScope)?.nodes.length || 0} 个固定节点`;
    }

    function renderSetupReview() {
        const character = collectCharacterDraft();
        const campaign = normalizeCampaign(isGameStarted()
            ? getMudState().campaign
            : getSettings().campaignDraft);
        root.querySelector('#hpmud_review_name').textContent = character.identity.name || '未命名';
        root.querySelector('#hpmud_review_world_title').textContent =
            `${campaign.startYear} · ${campaign.presetName}`;
        const background = root.querySelector('#hpmud_polished_background');
        if (!background.value.trim()) {
            background.value = buildLocalBackground(character);
        }
        const facts = root.querySelector('#hpmud_review_facts');
        facts.replaceChildren();
        [
            `${campaign.grade} 年级`,
            `${campaign.difficultyName}难度`,
            character.background.bloodStatus || '血统待定',
            character.aptitudes.strongDomain ? `优势：${character.aptitudes.strongDomain}` : '优势待发现',
            character.aptitudes.rareTalent === 'none' ? '无已知罕见天赋' : character.aptitudes.rareTalent,
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
        const slots = resolveRoleSlots(collectModelSlots());
        const profileId = slots.medium.profileId;
        if (!profileId) {
            toastr.warning('请先选择中档或高档 Connection Profile。');
            return;
        }
        button.disabled = true;
        button.textContent = '润色中…';
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
                    content: `You polish a structured player character background for a Hogwarts role-playing game beginning in ${campaign.startYear}, school grade ${campaign.grade}. Preserve every supplied fact, add no secret lineage or ability, write 180-260 English words, and output prose only.`,
                },
                { role: 'user', content: JSON.stringify(character) },
            ]);
            const content = String(response?.content || '').trim();
            if (!content) {
                throw new Error('模型没有返回背景文本。');
            }
            root.querySelector('#hpmud_polished_background').value = content;
        } catch (error) {
            console.error('[Hogwarts MUD] Character polish failed', error);
            toastr.error(String(error?.cause?.message || error?.message || error));
        } finally {
            button.disabled = false;
            button.textContent = '用中档 AI 润色';
        }
    }

    async function startGameFromSetup() {
        const wasStarted = isGameStarted();
        const character = collectCharacterDraft();
        const slots = collectModelSlots();
        const errors = validateCharacterDraft(character);
        if (!slots.low.profileId) {
            errors.push('请选择低档“现场表演者”Connection Profile。');
        }
        if (!root.querySelector('#hpmud_confirm_facts').checked) {
            errors.push('请确认人物卡事实。');
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
                ...structuredClone(character),
                confirmed: true,
            };
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
            toastr.success('人物卡与模型配置已保存。');
            return;
        }
        toastr.info('人物卡已确认。世界导演正在编排你的首幕。');
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

import {
    resolveNewAssistantStoryMessageId,
    resolveStoryScrollMode,
} from './story-scroll.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';
import {
    createActorNameField,
    createActorRoleField,
    createActorRuntimeField,
    getActorDisplayName,
} from '../domain/actor-display-name.js';
import {
    getCanonLocalizationZhCn,
} from '../canon-localization.zh-cn.js';
import {
    createCharacterInputLocalizationField,
} from '../domain/localization-candidates.js';
import {
    getSceneTimelineDisplaySummary,
} from '../domain/scene-timeline-display.js';
import { upgradePendingPostSettlement } from '../domain/pending-post-settlement.js';

export function createStoryRenderer(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        ARCHIVE_LIST_PAGE_SIZE,
        ARCHIVE_TRANSCRIPT_PAGE_SIZE,
        CURRENT_SCENE_PAGE_SIZE,
        closeMovementPicker,
        closeSpellPicker,
        createFallbackNextSceneIntent,
        createGenerationStatusCard,
        ensureLocalizedFields =
        async () => [],
        findSceneDestination,
        getAvailableTurnRollbackCheckpoint,
        getContext,
        getCurrentSceneMessageEntries,
        getFailedPlayerTurn,
        getMudState,
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
        getRoomName,
        getWorldState,
        initializeOpeningWorld,
        jobRegistry,
        openCalendar,
        projectPeoplePanel,
        requestFieldRetranslation =
        async () => [],
        renderAll,
        renderAuthorQuillCard,
        renderComposerAddressing,
        renderInspector,
        renderLiveSceneStream,
        renderMessage,
        renderMiniMap,
        retryFailedPlayerTurn,
        retryPendingPostSettlement =
        async () => {},
        discardPendingPostSettlement =
        async () => {},
        SAVE_REVISION_REFRESH_MESSAGE =
        'The timeline has changed. Refresh before continuing.',
        isSaveRevisionBlocked =
        () => false,
        validateNextSceneIntent,
    } = ports;

    const {
        root,
        storyElement,
        composerInput,
        sceneTransitionDialog,
    } = refs;

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

    function initials(name) {
        return String(name || '?')
            .split(/\s+/)
            .map(part => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    function localizedField(
        recordKind,
        recordId,
        fieldPath,
        sourceTextEn,
    ) {
        return getLocalizedField({
            recordKind,
            recordId:
                String(recordId || ''),
            fieldPath,
            sourceTextEn:
                String(
                    sourceTextEn ||
                    '',
                ),
        });
    }

    function ensureFields(
        fields,
        priority,
        label,
    ) {
        void Promise.resolve(
            ensureLocalizedFields(
                fields,
                {
                    priority,
                },
            ),
        ).catch(error =>
            console.warn(
                `[Hogwarts MUD] ${label} localization query failed`,
                error,
            ));
    }

    function getCurrentLocationText(
        state,
    ) {
        const mapId =
            state.scene?.mapId ||
            state.map?.activeMapId ||
            '';
        const roomId =
            state.scene?.roomId ||
            state.map
                ?.currentLocalNodeId ||
            '';
        if (mapId && roomId) {
            return getRoomName(
                state,
                mapId,
                roomId,
            );
        }
        return getLocalizedField({
            staticKey:
                state.phase ===
                    'playing'
                    ? 'map.location.unknown'
                    : 'map.status.world_setup',
            sourceTextEn:
                state.phase ===
                    'playing'
                    ? 'Unknown location'
                    : 'World setup in progress',
        }).text;
    }

    function getClockText(
        state,
    ) {
        const clock =
            String(
                state.clock ||
                '',
            );
        if (
            clock.endsWith(
                ' · Time pending',
            )
        ) {
            return `${
                clock.split(
                    ' · ',
                )[0]
            } · ${staticText(
                'ui.game.time_pending',
                'Time pending',
            )}`;
        }
        return clock;
    }

    function getChapterField(
        state,
    ) {
        return {
            ...(
                state.scene?.id
                    ? {}
                    : {
                        staticKey:
                            'story.chapter.opening_world',
                    }
            ),
            recordKind:
                'world_state',
            recordId: 'root',
            fieldPath:
                'chapterEn',
            sourceTextEn:
                state.chapterEn ||
                'Opening World',
        };
    }

    function createLocalizationStatus(
        fields,
    ) {
        const statuses =
            (fields || [])
                .map(field =>
                    getLocalizedField(
                        field,
                    ).status);
        const status =
            statuses.includes(
                'error',
            )
                ? 'error'
                : statuses.includes(
                    'pending',
                )
                    ? 'pending'
                    : '';
        const control =
            document.createElement(
                'span',
            );
        control.className =
            'hpmud-story-localization-control';
        const element =
            document.createElement(
                'small',
            );
        element.className =
            'hpmud-story-localization-status';
        element.classList.toggle(
            'is-visible',
            Boolean(status),
        );
        element.classList.toggle(
            'is-error',
            status === 'error',
        );
        element.textContent =
            status
                ? getLocalizedField({
                    staticKey:
                        `translation.status.${status}`,
                    sourceTextEn:
                        status === 'error'
                            ? 'Translation unavailable'
                            : 'Translating',
                }).text
                : '\u00a0';
        control.append(
            element,
        );
        if (
            status === 'error'
        ) {
            const retry =
                document.createElement(
                    'button',
                );
            retry.type = 'button';
            retry.className =
                'hpmud-story-localization-retry';
            retry.textContent =
                getLocalizedField({
                    staticKey:
                        'translation.action.retranslate',
                    sourceTextEn:
                        'Retranslate',
                }).text;
            retry.addEventListener(
                'click',
                async () => {
                    retry.disabled =
                        true;
                    try {
                        await requestFieldRetranslation(
                            fields.filter(field =>
                                getLocalizedField(
                                    field,
                                ).status ===
                                    'error'),
                            {
                                priority: 1,
                            },
                        );
                    } finally {
                        retry.disabled =
                            false;
                    }
                },
            );
            control.append(
                retry,
            );
        }
        return control;
    }

    function getPeopleDisplay(_state, person) {
        const displayName =
            getActorDisplayName({
                actorId:
                    person.id,
                nameEn:
                    person.header
                        ?.name,
                displayLocale:
                    session
                        .displayLocale,
                getLocalizedField,
            });
        const roleField =
            createActorRoleField(
                person.id,
                person.header
                    ?.role,
            );
        const activityField =
            createActorRuntimeField(
                person.id,
                'currentActivityEn',
                person.current
                    ?.activity,
            );
        const lifeStatusDetailField =
            createActorRuntimeField(
                person.id,
                'lifeStatusDetailEn',
                person.current
                    ?.lifeStatusDetail,
            );
        const intentField =
            createActorRuntimeField(
                person.id,
                'currentIntentEn',
                person.current
                    ?.intent,
            );
        return {
            displayName,
            detail: [
                person.current
                    ?.location,
                getLocalizedField(
                    activityField,
                ).text ||
                    getLocalizedField(
                        roleField,
                    ).text,
                getLocalizedField(
                    lifeStatusDetailField,
                ).text,
            ].filter(Boolean).join(' · '),
            intent:
                getLocalizedField(
                    intentField,
                ).text,
        };
    }

    function renderHeaderAndScene() {
        const context = getContext();
        const state = getWorldState();
        const playerName =
            state.character
                ?.inputEvidence
                ?.identity
                ?.name ||
            context.name1 ||
            'Player';
        const playerNameField =
            createCharacterInputLocalizationField(
                'identity.name',
                playerName,
            );
        const chapterField =
            getChapterField(
                state,
            );
        ensureFields(
            [
                chapterField,
                playerNameField,
            ],
            1,
            'Header',
        );

        root.querySelector('#hpmud_location').textContent =
            getCurrentLocationText(
                state,
            );
        root.querySelector('#hpmud_chapter').textContent =
            getLocalizedField(
                chapterField,
            ).text ||
            chapterField.sourceTextEn;
        root.querySelector('#hpmud_clock').textContent =
            getClockText(state);
        root.querySelector('#hpmud_character').textContent =
            initials(
                getLocalizedField(
                    playerNameField,
                ).text ||
                playerName,
            );

        const people = root.querySelector('#hpmud_people');
        people.replaceChildren();
        const peopleProjection =
            projectPeoplePanel(
                state,
                {
                    getRoomName,
                    getLocalizedField,
                    displayLocale:
                        session
                            .displayLocale,
                },
            );
        const visiblePeople = [
            ...peopleProjection
                .activePeople,
            ...peopleProjection
                .localPeople,
        ];
        const peopleFields = [
            ...visiblePeople
                .filter(person =>
                    !getCanonLocalizationZhCn(
                        person.id,
                    ))
                .map(person =>
                    createActorNameField(
                        person.id,
                        person.header
                            ?.name,
                    )),
            ...visiblePeople
                .flatMap(person => [
                    createActorRoleField(
                        person.id,
                        person.header
                            ?.role,
                    ),
                    createActorRuntimeField(
                        person.id,
                        'currentActivityEn',
                        person.current
                            ?.activity,
                    ),
                    createActorRuntimeField(
                        person.id,
                        'lifeStatusDetailEn',
                        person.current
                            ?.lifeStatusDetail,
                    ),
                    createActorRuntimeField(
                        person.id,
                        'currentIntentEn',
                        person.current
                            ?.intent,
                    ),
                ]),
        ];
        ensureFields(
            peopleFields,
            1,
            'People',
        );
        if (!peopleProjection.activePeople.length) {
            const status = document.createElement('div');
            status.className = 'hpmud-people-pending';
            status.textContent =
                state.phase ===
                    'initialization_failed'
                    ? staticText(
                        'ui.story.opening_failed',
                        'Opening arrangement failed',
                    )
                    : state.phase === 'playing'
                        ? staticText(
                            'ui.story.no_interactive_characters',
                            'No interactive characters',
                        )
                        : staticText(
                            'ui.story.confirming_characters',
                            'The World Director is confirming characters...',
                        );
            people.append(status);
        } else {
            peopleProjection
                .activePeople
                .forEach(personData => {
                    const {
                        displayName,
                        detail,
                        intent,
                    } = getPeopleDisplay(
                        state,
                        personData,
                    );
                    const person =
                        document.createElement(
                            'button',
                        );
                    person.type = 'button';
                    person.className =
                        `hpmud-person${
                            session.selectedActorId ===
                            personData.id
                                ? ' active'
                                : ''
                        }`;
                    person.dataset.actorId =
                        personData.id;
                    person.setAttribute(
                        'aria-pressed',
                        String(
                            session.selectedActorId ===
                            personData.id,
                        ),
                    );
                    person.innerHTML = `
                    <span class="hpmud-person-avatar">${initials(displayName)}</span>
                    <span><strong></strong><small></small></span>
                `;
                    person.querySelector(
                        'strong',
                    ).textContent =
                        displayName;
                    person.querySelector(
                        'small',
                    ).textContent = detail;
                    person.title = intent;
                    person.addEventListener(
                        'click',
                        () => {
                            session.selectedActorId =
                                personData.id;
                            root.classList.add(
                                'hpmud-inspector-open',
                            );
                            renderHeaderAndScene();
                            renderInspector(
                                'actor',
                            );
                        },
                    );
                    people.append(person);
                });
        }
        root.querySelector(
            '#hpmud_people_count',
        ).textContent = String(
            peopleProjection
                .activePeople.length,
        );
        const localPeople = root.querySelector(
            '#hpmud_local_people',
        );
        const localCohorts = root.querySelector(
            '#hpmud_local_cohorts',
        );
        localPeople.replaceChildren();
        localCohorts.replaceChildren();
        peopleProjection.localPeople.forEach(
            personData => {
                const {
                    displayName,
                    detail,
                } = getPeopleDisplay(
                    state,
                    personData,
                );
                const person =
                    document.createElement(
                        'div',
                    );
                person.className =
                    'hpmud-local-person';
                person.innerHTML = `
                <span class="hpmud-local-person-mark" aria-hidden="true"></span>
                <span><strong></strong><small></small></span>
            `;
                person.querySelector(
                    'strong',
                ).textContent = displayName;
                person.querySelector(
                    'small',
                ).textContent = detail;
                localPeople.append(person);
            },
        );
        peopleProjection.cohorts.forEach(
            cohort => {
                const field = {
                    recordKind:
                        'cohort',
                    recordId:
                        cohort.id,
                    fieldPath:
                        'labelEn',
                    sourceTextEn:
                        cohort.label,
                };
                ensureFields(
                    [
                        field,
                    ],
                    1,
                    'Cohort',
                );
                const summary =
                    document.createElement('p');
                summary.textContent =
                    formatStaticText(
                        'ui.story.other_cohort',
                        'Other {label} members',
                        {
                            label:
                                getLocalizedField(
                                    field,
                                ).text,
                        },
                    );
                localCohorts.append(summary);
            },
        );
        if (
            !peopleProjection.localPeople
                .length &&
            !peopleProjection.cohorts.length
        ) {
            const empty =
                document.createElement('p');
            empty.className =
                'hpmud-local-people-empty';
            empty.textContent =
                peopleProjection
                    .localPresenceValid
                    ? staticText(
                        'ui.story.no_other_characters',
                        'No other confirmed characters',
                    )
                    : staticText(
                        'ui.story.location_characters_pending',
                        'Location characters are not confirmed yet',
                    );
            localCohorts.append(empty);
        }
        root.querySelector(
            '#hpmud_local_people_count',
        ).textContent = String(
            peopleProjection
                .localPeople.length,
        );
        if (composerInput) {
            renderComposerAddressing();
        }
        const agenda = root.querySelector('#hpmud_agenda');
        agenda.replaceChildren();
        const timelineEntries =
            state.scene
                ?.timelineEntries ||
            [];
        const entries = timelineEntries.length
            ? timelineEntries.slice(-4)
            : [{
                clock: state.clock,
                summaryEn:
                    state.phase ===
                        'playing'
                        ? state.scene
                            ?.summaryEn ||
                            'Current scene'
                        : 'Opening World',
            }];
        const timelineOffset =
            Math.max(
                0,
                timelineEntries.length -
                    entries.length,
            );
        const entryFields =
            entries.map((
                entry,
                index,
            ) => ({
                recordKind:
                    timelineEntries.length
                        ? 'scene_timeline'
                        : 'scene',
                recordId:
                    timelineEntries.length
                        ? `${
                            state.scene.id
                        }:${
                            timelineOffset +
                            index
                        }`
                        : state.scene?.id ||
                            'opening_world',
                fieldPath:
                    'summaryEn',
                sourceTextEn:
                    getSceneTimelineDisplaySummary(
                        entry.summaryEn,
                    ),
            }));
        ensureFields(
            entryFields,
            1,
            'Scene timeline',
        );
        agenda.setAttribute(
            'aria-label',
            formatStaticText(
                'ui.story.live_log_title',
                'Current Scene live record: {entries}',
                {
                    entries:
                        entries
                            .map((
                                entry,
                                index,
                            ) =>
                                `${
                                    entry.clock ||
                                    ''
                                } ${
                                    getLocalizedField(
                                        entryFields[
                                            index
                                        ],
                                    ).text
                                }`)
                            .join('; '),
                },
            ),
        );
        entries.forEach((
            entry,
            index,
        ) => {
            const row = document.createElement('span');
            const time = document.createElement('time');
            time.textContent =
                entry.timeLabel ||
                String(
                    entry.clock ||
                    '',
                ).split(' · ')
                    .at(-1) ||
                staticText(
                    'ui.story.now',
                    'Now',
                );
            row.append(
                time,
                document.createTextNode(
                    ` ${
                        getLocalizedField(
                            entryFields[
                                index
                            ],
                        ).text
                    }`,
                ),
            );
            agenda.append(row);
        });
        renderSceneArchiveList(state);
        renderMiniMap(state);
    }

    function renderSceneArchiveList(state) {
        const list = root.querySelector('#hpmud_scene_archive_list');
        const archive = state.sceneArchive || [];
        const current = root.querySelector('#hpmud_current_scene_card');
        root.querySelector('#hpmud_scene_archive_count').textContent = String(archive.length);
        current.replaceChildren();
        const currentLabel = document.createElement('small');
        const currentTitle = document.createElement('strong');
        const currentMeta = document.createElement('span');
        const currentNameField = {
            recordKind: 'scene',
            recordId:
                state.scene?.id ||
                '',
            fieldPath: 'nameEn',
            sourceTextEn:
                state.scene?.nameEn ||
                '',
        };
        ensureFields(
            [
                currentNameField,
            ],
            1,
            'Current Scene',
        );
        currentLabel.textContent =
            staticText(
                'ui.story.current_scene',
                'Current Scene',
            );
        currentTitle.textContent =
            getLocalizedField(
                currentNameField,
            ).text ||
            staticText(
                'ui.story.current_scene',
                'Current Scene',
            );
        currentMeta.textContent = [
            String(state.scene?.startedClock || state.clock || '')
                .split(' · ')
                .at(-1),
            getCurrentLocationText(
                state,
            ),
        ].filter(Boolean).join(' · ');
        current.append(currentLabel, currentTitle, currentMeta);
        list.replaceChildren();
        if (!archive.length) {
            const empty = document.createElement('div');
            empty.className = 'hpmud-scene-archive-empty';
            empty.textContent =
                staticText(
                    'ui.story.archive_empty',
                    'The read-only archive appears after the first Scene ends.',
                );
            list.append(empty);
            return;
        }
        const visibleArchive = [...archive]
            .reverse()
            .slice(0, session.archiveListLimit);
        ensureFields(
            visibleArchive.flatMap(scene => [
                {
                    recordKind:
                        'scene_archive',
                    recordId: scene.id,
                    fieldPath:
                        'nameEn',
                    sourceTextEn:
                        scene.nameEn ||
                        '',
                },
                {
                    recordKind:
                        'scene_archive',
                    recordId: scene.id,
                    fieldPath:
                        'summaryEn',
                    sourceTextEn:
                        scene.summaryEn ||
                        '',
                },
            ]),
            3,
            'Scene Archive list',
        );
        visibleArchive.forEach(scene => {
            const button = document.createElement('button');
            button.type = 'button';
            const marker = document.createElement('i');
            const content = document.createElement('span');
            const title = document.createElement('strong');
            const meta = document.createElement('small');
            title.textContent =
                localizedField(
                    'scene_archive',
                    scene.id,
                    'nameEn',
                    scene.nameEn,
                ).text ||
                staticText(
                    'ui.story.unnamed_scene',
                    'Unnamed Scene',
                );
            meta.textContent = [
                String(scene.endedClock || '').split(' · ').at(-1),
                getRoomName(
                    state,
                    scene.mapId,
                    scene.roomId,
                ),
            ].filter(Boolean).join(' · ');
            content.append(title, meta);
            button.append(marker, content);
            button.addEventListener('click', () => openSceneArchive(scene.id));
            list.append(button);
        });
        if (visibleArchive.length < archive.length) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'hpmud-archive-more';
            more.textContent =
                formatStaticText(
                    'ui.story.load_earlier_scenes',
                    'Load earlier Scenes · {count} remaining',
                    {
                        count:
                            archive.length -
                            visibleArchive.length,
                    },
                );
            more.addEventListener('click', () => {
                session.archiveListLimit += ARCHIVE_LIST_PAGE_SIZE;
                renderSceneArchiveList(state);
            });
            list.append(more);
        }
    }

    function renderSceneArchiveTranscript(
        scene,
        preserveScrollAnchor = false,
        target = null,
        {
            readOnly = false,
        } = {},
    ) {
        const transcript =
            target ||
            root.querySelector(
                '#hpmud_archive_transcript',
            );
        const scroll = transcript.closest('.hpmud-dialog-scroll');
        const previousHeight = scroll?.scrollHeight || 0;
        transcript.replaceChildren();
        const context = getContext();
        const messageIds = scene.messageIds || [];
        const visibleIds = messageIds.slice(-session.archiveTranscriptLimit);
        const archiveFields = [
            {
                recordKind:
                    'scene_archive',
                recordId: scene.id,
                fieldPath:
                    'authorQuillEn',
                sourceTextEn:
                    scene.authorQuillEn ||
                    '',
            },
            {
                recordKind:
                    'scene_archive',
                recordId: scene.id,
                fieldPath:
                    'closureSummaryEn',
                sourceTextEn:
                    scene
                        .closureSummaryEn ||
                    '',
            },
            {
                recordKind:
                    'scene_archive',
                recordId: scene.id,
                fieldPath:
                    'summaryEn',
                sourceTextEn:
                    scene.summaryEn ||
                    '',
            },
        ];
        ensureFields(
            archiveFields,
            1,
            'Scene Archive',
        );
        if (visibleIds.length < messageIds.length) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'hpmud-load-earlier';
            more.textContent =
                formatStaticText(
                    'ui.story.load_earlier_records',
                    'Load earlier records · {count} remaining',
                    {
                        count:
                            messageIds.length -
                            visibleIds.length,
                    },
                );
            more.addEventListener('click', () => {
                session.archiveTranscriptLimit += ARCHIVE_TRANSCRIPT_PAGE_SIZE;
                renderSceneArchiveTranscript(
                    scene,
                    true,
                    transcript,
                    {
                        readOnly,
                    },
                );
            });
            transcript.append(more);
        }
        visibleIds.forEach(messageId => {
            const message = context.chat[messageId];
            if (message) {
                transcript.append(
                    renderMessage(
                        message,
                        messageId,
                        {
                            readOnly,
                        },
                    ),
                );
            }
        });
        const localizedQuill =
            getLocalizedField(
                archiveFields[0],
            ).text;
        const quillCard = renderAuthorQuillCard(
            {
                authorQuill:
                    localizedQuill,
                authorQuillEn: scene.authorQuillEn,
            },
            {
                mes:
                    localizedQuill ||
                    '',
            },
        );
        if (quillCard) {
            quillCard.classList.add('is-archive');
            transcript.append(quillCard);
        }
        if (!transcript.childElementCount) {
            const empty = document.createElement('div');
            empty.className = 'hpmud-scene-archive-empty';
            empty.textContent =
                getLocalizedField(
                    archiveFields[1],
                ).text ||
                getLocalizedField(
                    archiveFields[2],
                ).text ||
                staticText(
                    'ui.story.archive_no_transcript',
                    'This Scene has no visible live transcript.',
                );
            transcript.append(empty);
        }
        if (preserveScrollAnchor && scroll) {
            scroll.scrollTop += scroll.scrollHeight - previousHeight;
        }
    }

    function openSceneArchive(sceneId) {
        const state = getWorldState();
        const scene = state.sceneArchive.find(item => item.id === sceneId);
        if (!scene) {
            toastr.warning(
                staticText(
                    'ui.story.archive_missing',
                    'This Scene archive does not exist or is not sealed yet.',
                ),
            );
            return;
        }
        openCalendar({
            archiveId: scene.id,
        });
    }

    function updateSceneDestinationStatus() {
        const state = getMudState();
        const input = root.querySelector('#hpmud_transition_destination');
        const status = root.querySelector('#hpmud_transition_destination_status');
        const intent = state?.scene?.nextSceneIntent;
        const usesDefault = input.value.trim() ===
            String(input.dataset.defaultValue || '').trim();
        const destination = usesDefault && intent
            ? {
                mapId: intent.mapId,
                roomId: intent.roomId,
            }
            : findSceneDestination(input.value, state);
        const roomName =
            destination
                ? getRoomName(
                    state,
                    destination.mapId,
                    destination.roomId,
                )
                : '';
        status.textContent = destination
            ? formatStaticText(
                'ui.story.destination.matched',
                '{source} · {room}',
                {
                    source:
                        usesDefault
                            ? staticText(
                                'ui.story.destination.director',
                                'Director plan',
                            )
                            : staticText(
                                'ui.story.destination.user',
                                'User override',
                            ),
                    room:
                        roomName ||
                        destination
                            .roomId,
                },
            )
            : staticText(
                'ui.story.destination.unmatched',
                'The user override did not match a fixed room. Settlement will choose the best existing Map location.',
            );
    }

    function createSceneIntentFields(
        state,
        intent,
    ) {
        return [
            {
                recordKind:
                    'scene_intent',
                recordId:
                    state.scene
                        ?.id ||
                    '',
                fieldPath:
                    'titleEn',
                sourceTextEn:
                    intent?.titleEn ||
                    '',
            },
            {
                recordKind:
                    'scene_intent',
                recordId:
                    state.scene
                        ?.id ||
                    '',
                fieldPath:
                    'summaryEn',
                sourceTextEn:
                    intent?.summaryEn ||
                    '',
            },
        ];
    }

    function formatNextSceneIntent(
        fields,
    ) {
        return [
            ...fields.map(field =>
                getLocalizedField(
                    field,
                ).text),
        ].filter(Boolean).join('：');
    }

    function openSceneTransitionDialog() {
        if (
            isSaveRevisionBlocked()
        ) {
            toastr.error(
                staticText(
                    'ui.story.stale_timeline',
                    SAVE_REVISION_REFRESH_MESSAGE,
                ),
            );
            return;
        }
        if (
            getWorldState()
                ?.turn?.status ===
            'post_unsettled'
        ) {
            toastr.warning(
                staticText(
                    'ui.story.post_unsettled.blocked',
                    'Settle or discard the saved Scene before submitting another action.',
                ),
            );
            return;
        }
        const state = getWorldState();
        if (state.phase !== 'playing' || !state.scene) {
            toastr.warning(
                staticText(
                    'ui.story.no_active_scene',
                    'There is no active Scene to archive.',
                ),
            );
            return;
        }
        if (jobRegistry.sceneTransitionActive || jobRegistry.turnActive) {
            toastr.warning(
                staticText(
                    'ui.story.world_settling',
                    'World State is still settling. Please wait.',
                ),
            );
            return;
        }
        const intent = validateNextSceneIntent(
            state.scene.nextSceneIntent,
            state,
        ).valid
            ? state.scene.nextSceneIntent
            : createFallbackNextSceneIntent(state);
        const sceneNameField = {
            recordKind: 'scene',
            recordId:
                state.scene.id,
            fieldPath: 'nameEn',
            sourceTextEn:
                state.scene.nameEn ||
                '',
        };
        const intentFields =
            createSceneIntentFields(
                state,
                intent,
            );
        ensureFields(
            [
                sceneNameField,
                ...intentFields,
            ],
            1,
            'Scene Transition',
        );
        root.querySelector('#hpmud_transition_scene_name').textContent =
            getLocalizedField(
                sceneNameField,
            ).text ||
            staticText(
                'ui.story.current_scene',
                'Current Scene',
            );
        root.querySelector('#hpmud_transition_scene_meta').textContent =
            `${state.clock} · ${getCurrentLocationText(state)}`;
        const input = root.querySelector('#hpmud_transition_destination');
        input.dataset.defaultValue =
            formatNextSceneIntent(
                intentFields,
            );
        input.value = state.sceneTransition?.status === 'failed' &&
            state.sceneTransition.destinationHint
            ? state.sceneTransition.destinationHint
            : input.dataset.defaultValue;
        const selectedTier = state.sceneTransition?.status === 'failed'
            ? state.sceneTransition.tier
            : intent.tier;
        root.querySelector(
            `input[name="scene_transition_tier"][value="${selectedTier}"]`,
        ).checked = true;
        updateSceneDestinationStatus();
        sceneTransitionDialog.showModal();
    }

    function renderStory(preserveScrollAnchor = false) {
        const context = getContext();
        const state = getWorldState();
        const saveRevisionBlocked =
            isSaveRevisionBlocked();
        const sceneId = state.scene?.id || '';
        const initialSceneLoad =
            !session.renderedSceneId;
        const sceneChanged =
            session.renderedSceneId !==
            sceneId;
        if (sceneChanged) {
            session.renderedSceneId = sceneId;
            session.latestStoryMessageId =
                null;
            session.currentSceneMessageLimit = CURRENT_SCENE_PAGE_SIZE;
            session.archiveListLimit = ARCHIVE_LIST_PAGE_SIZE;
        }
        const entries = getCurrentSceneMessageEntries(context, state);
        const visibleEntries = entries.slice(-session.currentSceneMessageLimit);
        const latestEntry =
            visibleEntries.at(-1) ||
            null;
        const newAssistantMessageId =
            resolveNewAssistantStoryMessageId(
                session
                    .latestStoryMessageId,
                latestEntry,
            );
        session.latestStoryMessageId =
            Number.isInteger(
                Number(
                    latestEntry
                        ?.messageId,
                ),
            )
                ? Number(
                    latestEntry
                        .messageId,
                )
                : null;
        const previousHeight = storyElement.scrollHeight;
        const wasNearBottom = storyElement.scrollHeight - storyElement.scrollTop - storyElement.clientHeight < 100;
        storyElement.replaceChildren();

        if (state.phase === 'playing' && state.scene) {
            const sceneFields = [
                {
                    recordKind:
                        'scene',
                    recordId:
                        state.scene.id,
                    fieldPath:
                        'nameEn',
                    sourceTextEn:
                        state.scene
                            .nameEn ||
                        '',
                },
                {
                    recordKind:
                        'scene',
                    recordId:
                        state.scene.id,
                    fieldPath:
                        'summaryEn',
                    sourceTextEn:
                        state.scene
                            .summaryEn ||
                        '',
                },
                getChapterField(
                    state,
                ),
            ];
            ensureFields(
                sceneFields,
                1,
                'Current Scene heading',
            );
            const heading = document.createElement('section');
            heading.className = 'hpmud-current-scene-heading';
            const eyebrow = document.createElement('small');
            const title = document.createElement('h2');
            const summary = document.createElement('p');
            const meta = document.createElement('span');
            eyebrow.textContent =
                staticText(
                    'ui.story.current_scene_eyebrow',
                    'CURRENT SCENE',
                );
            title.textContent =
                getLocalizedField(
                    sceneFields[0],
                ).text ||
                staticText(
                    'ui.story.unnamed_scene',
                    'Unnamed Scene',
                );
            summary.textContent =
                getLocalizedField(
                    sceneFields[1],
                ).text ||
                staticText(
                    'ui.story.scene_ready',
                    'The Scene is established and awaits the next action.',
                );
            meta.textContent = [
                state.scene.startedClock || state.clock,
                getCurrentLocationText(
                    state,
                ),
            ].filter(Boolean).join(' · ');
            heading.append(
                eyebrow,
                title,
                summary,
                meta,
                createLocalizationStatus(
                    sceneFields,
                ),
            );
            storyElement.append(heading);
        }

        if (visibleEntries.length < entries.length) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'hpmud-load-earlier';
            more.textContent =
                formatStaticText(
                    'ui.story.load_current_earlier',
                    'Load earlier current-Scene records · {count} remaining',
                    {
                        count:
                            entries.length -
                            visibleEntries.length,
                    },
                );
            more.addEventListener('click', () => {
                session.currentSceneMessageLimit += CURRENT_SCENE_PAGE_SIZE;
                renderStory(true);
            });
            storyElement.append(more);
        }

        if (!visibleEntries.length) {
            const empty = document.createElement('div');
            if (state.phase === 'playing') {
                empty.className = 'hpmud-empty hpmud-current-scene-empty';
                empty.textContent =
                    staticText(
                        'ui.story.current_empty',
                        'The current Scene has no live record yet.',
                    );
            } else {
                empty.className = `hpmud-empty hpmud-opening-state phase-${state.phase}`;
            }
            if (state.phase === 'playing') {
                // The current-scene heading already provides the scene context.
            } else if (state.phase === 'initialization_failed') {
                empty.innerHTML = `
                <small>OPENING TRANSACTION PAUSED</small>
                <strong></strong>
                <span></span>
                <button id="hpmud_retry_opening" type="button"></button>
            `;
                empty.querySelector(
                    'strong',
                ).textContent =
                    staticText(
                        'ui.story.opening_not_committed',
                        'Opening arrangement was not committed',
                    );
                empty.querySelector('span').textContent =
                    staticText(
                        'ui.story.world_director_failed',
                        'World Director call failed.',
                    );
                const retryOpening =
                    empty.querySelector(
                        '#hpmud_retry_opening',
                    );
                retryOpening.textContent =
                    staticText(
                        'ui.story.opening_retry',
                        'Arrange opening again',
                    );
                retryOpening.disabled =
                    saveRevisionBlocked;
                retryOpening.addEventListener('click', () => {
                    void initializeOpeningWorld().catch(error => {
                        console.error('[Hogwarts MUD] Opening retry failed', error);
                        toastr.error(String(error?.cause?.message || error?.message || error));
                    });
                });
            } else {
                const hasCommittedWorld = Boolean(state.opening?.package);
                empty.innerHTML = `
                <small>WORLD OPENING TRANSACTION</small>
                <strong></strong>
                <span></span>
                <ol>
                    <li class="${hasCommittedWorld ? 'done' : 'active'}"></li>
                    <li class="${hasCommittedWorld ? 'active' : ''}"></li>
                    <li></li>
                </ol>
            `;
                empty.querySelector(
                    'strong',
                ).textContent =
                    hasCommittedWorld
                        ? staticText(
                            'ui.story.opening.committed_title',
                            'The Scene is fixed. Writing the opening now.',
                        )
                        : staticText(
                            'ui.story.opening.arranging_title',
                            'The World Director is arranging your opening.',
                        );
                empty.querySelector(
                    'span',
                ).textContent =
                    hasCommittedWorld
                        ? staticText(
                            'ui.story.opening.committed_detail',
                            'Time, location, Map, characters, and hidden Storylines are committed. Scene planning and performance may take several minutes. Keep the page open.',
                        )
                        : staticText(
                            'ui.story.opening.arranging_detail',
                            'Determining time, home Scene, present characters, and dramatic conflict from the character background. Keep the page open.',
                        );
                const steps = [
                    ...empty.querySelectorAll(
                        'li',
                    ),
                ];
                steps[0].textContent =
                    staticText(
                        'ui.story.opening.step.world',
                        'World Director establishes the Scene',
                    );
                steps[1].textContent =
                    staticText(
                        'ui.story.opening.step.performance',
                        'Medium tier plans · Low tier performs',
                    );
                steps[2].textContent =
                    staticText(
                        'ui.story.opening.step.player',
                        'Await your first action',
                    );
            }
            storyElement.append(empty);
        } else {
            visibleEntries.forEach(({ message, messageId }) =>
                storyElement.append(renderMessage(message, messageId)));
        }

        const unsaved = jobRegistry.unsavedPostNarrative?.chat === context.chat
            ? jobRegistry.unsavedPostNarrative : null;
        if (unsaved) {
            storyElement.append(renderMessage(unsaved.message, unsaved.messageId));
            const warning = document.createElement('div');
            warning.className = 'hpmud-system-turn hpmud-post-recovery';
            warning.textContent = staticText('ui.story.post_unsettled.unsaved', 'Reply not saved.');
            const saveOnly = document.createElement('button');
            saveOnly.type = 'button';
            saveOnly.textContent = staticText('ui.story.post_unsettled.save_only', 'Retry saving reply');
            saveOnly.disabled = jobRegistry.turnActive;
            saveOnly.addEventListener('click', () => {
                saveOnly.disabled = true;
                void retryPendingPostSettlement({ saveOnly: true }).catch(error => {
                    console.error('[Hogwarts MUD] Narrative save retry failed', error);
                    toastr.error(staticText('ui.story.post_unsettled.action_failed', 'Settlement could not be saved.'));
                }).finally(() => renderAll());
            });
            warning.append(saveOnly);
            storyElement.append(warning);
        }
        if (saveRevisionBlocked && !unsaved) {
            const conflict =
                document.createElement(
                    'div',
                );
            conflict.className =
                'hpmud-system-turn hpmud-turn-failure';
            const title =
                document.createElement(
                    'strong',
                );
            const detail =
                document.createElement(
                    'span',
                );
            title.textContent =
                staticText(
                    'ui.story.timeline_updated',
                    'Timeline updated',
                );
            detail.textContent =
                staticText(
                    'ui.story.stale_timeline',
                    SAVE_REVISION_REFRESH_MESSAGE,
                );
            conflict.append(
                title,
                detail,
            );
            storyElement.append(
                conflict,
            );
        }

        if (
            state.turn?.status ===
            'post_unsettled' &&
            !unsaved &&
            !jobRegistry.turnActive
        ) {
            const recovery =
                document.createElement(
                    'div',
                );
            recovery.className =
                'hpmud-system-turn hpmud-turn-failure hpmud-post-recovery';
            const title =
                document.createElement(
                    'strong',
                );
            const detail =
                document.createElement(
                    'span',
                );
            const retry =
                document.createElement(
                    'button',
                );
            const discard =
                document.createElement(
                    'button',
                );
            const actions =
                document.createElement(
                    'div',
                );
            let pending =
                context.chat.at(-1)?.extra
                    ?.hogwartsMud
                    ?.pendingPostSettlement ||
                null;
            let invalidLegacy = false;
            if (pending?.version === 1) {
                try {
                    pending = upgradePendingPostSettlement(state, context.chat, pending);
                } catch {
                    invalidLegacy = true;
                }
            }
            const selectionKey = JSON.stringify([
                state.timelineEpoch, pending?.sceneMessageId, pending?.recovery?.sourceIdentity,
                pending?.recovery?.groups?.map(group => group.id),
            ]);
            if (session.postRecoverySelection?.key !== selectionKey) {
                session.postRecoverySelection = {
                    key: selectionKey, groups: new Set(pending?.recovery?.groups?.map(group => group.id) || []),
                };
            }
            const selectedGroups = session.postRecoverySelection.groups;
            const fields = document.createElement('fieldset');
            fields.className = 'hpmud-post-recovery-fields';
            for (const group of pending?.recovery?.groups || []) {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = selectedGroups.has(group.id);
                checkbox.disabled = saveRevisionBlocked || pending?.recovery?.supplement?.status !== 'available';
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) selectedGroups.add(group.id);
                    else selectedGroups.delete(group.id);
                    retry.disabled = saveRevisionBlocked || pending?.retryable !== true || !selectedGroups.size
                        || pending?.recovery?.supplement?.status !== 'available';
                });
                label.append(checkbox, document.createTextNode(
                    `${staticText(`ui.story.post_family.${group.id}`, 'Settlement')} (${group.count})`,
                ));
                fields.append(label);
            }
            title.textContent =
                staticText(
                    'ui.story.post_unsettled.title',
                    'Scene saved. Post settlement is pending.',
                );
            detail.textContent =
                staticText(
                    pending?.recovery?.blockingMovement
                        ? 'ui.story.post_unsettled.movement_blocked'
                        : pending?.recovery?.supplement?.status !== 'available'
                            ? 'ui.story.post_unsettled.spent' : 'ui.story.post_unsettled.detail',
                    'No world changes were committed. Retry Post or discard this turn.',
                );
            retry.type = 'button';
            retry.className =
                'hpmud-retry-turn';
            retry.disabled =
                saveRevisionBlocked ||
                pending?.retryable !==
                    true || pending?.recovery?.supplement?.status !== 'available'
                    || !selectedGroups.size;
            retry.textContent =
                staticText(
                    'ui.story.post_unsettled.supplement',
                    'Supplement selected once',
                );
            retry.addEventListener(
                'click',
                () => {
                    retry.disabled = true;
                    retry.classList.add(
                        'is-loading',
                    );
                    void retryPendingPostSettlement({ selectedGroupIds: [...selectedGroups] })
                        .catch(error => {
                            console.error(
                                '[Hogwarts MUD] Post settlement retry failed',
                                error,
                            );
                            toastr.error(
                                staticText('ui.story.post_unsettled.action_failed', 'Settlement could not be saved.'),
                            );
                        })
                        .finally(() =>
                            renderAll());
                },
            );
            discard.type = 'button';
            discard.className =
                'hpmud-retry-turn hpmud-discard-turn';
            discard.disabled =
                saveRevisionBlocked ||
                pending?.discardable !==
                    true;
            discard.textContent =
                staticText(
                    'ui.story.post_unsettled.discard',
                    'Discard turn',
                );
            discard.addEventListener(
                'click',
                () => {
                    if (
                        !window.confirm(
                            staticText(
                                'ui.story.post_unsettled.discard_confirm',
                                'Discard this uncommitted turn and remove its saved Scene?',
                            ),
                        )
                    ) {
                        return;
                    }
                    discard.disabled = true;
                    discard.classList.add(
                        'is-loading',
                    );
                    void discardPendingPostSettlement()
                        .then(result => {
                            if (
                                result?.playerAction &&
                                composerInput
                            ) {
                                composerInput.value =
                                    result.playerAction;
                                composerInput.dispatchEvent(
                                    new Event('input'),
                                );
                            }
                        })
                        .catch(error => {
                            console.error(
                                '[Hogwarts MUD] Post settlement discard failed',
                                error,
                            );
                        })
                        .finally(() =>
                            renderAll());
                },
            );
            actions.className =
                'hpmud-post-settlement-actions';
            const defaults = document.createElement('button');
            defaults.type = 'button';
            defaults.className = 'hpmud-retry-turn';
            defaults.textContent = staticText('ui.story.post_unsettled.defaults', 'Continue with defaults');
            defaults.disabled = saveRevisionBlocked || invalidLegacy || !pending
                || pending?.recovery?.blockingMovement === true;
            defaults.addEventListener('click', () => {
                defaults.disabled = true;
                retry.disabled = true;
                void retryPendingPostSettlement({ defaults: true })
                    .catch(() => toastr.error(staticText(
                        'ui.story.post_unsettled.action_failed', 'Settlement could not be saved.',
                    )))
                    .finally(() => renderAll());
            });
            actions.append(
                retry,
                defaults,
                discard,
            );
            recovery.append(
                title,
                detail,
                fields,
                actions,
            );
            storyElement.append(recovery);
        }
        const failedPlayerTurn =
            getFailedPlayerTurn(
                context.chat,
                state.turn,
            );
        if (
            failedPlayerTurn &&
            !jobRegistry.turnActive
        ) {
            const failure =
                document.createElement(
                    'div',
                );
            failure.className =
                'hpmud-system-turn hpmud-turn-failure';
            const title =
                document.createElement(
                    'strong',
                );
            const detail =
                document.createElement(
                    'span',
                );
            const retry =
                document.createElement(
                    'button',
                );
            title.textContent =
                staticText(
                    'ui.story.reply_failed',
                    'Reply generation failed. The player message was saved.',
                );
            detail.textContent =
                staticText(
                    'ui.story.reply_invalid',
                    'The low-tier model did not submit a valid Scene reply.',
                );
            retry.type = 'button';
            retry.className =
                'hpmud-retry-turn';
            retry.disabled =
                saveRevisionBlocked;
            retry.textContent =
                staticText(
                    'ui.story.retry_turn',
                    'Retry this turn',
                );
            retry.addEventListener(
                'click',
                () => {
                    retry.disabled = true;
                    retry.classList.add(
                        'is-loading',
                    );
                    retry.textContent =
                        staticText(
                            'ui.story.retrying',
                            'Retrying',
                        );
                    void retryFailedPlayerTurn();
                },
            );
            failure.append(
                title,
                detail,
                retry,
            );
            storyElement.append(failure);
        }

        if (jobRegistry.sceneTransitionActive && state.phase === 'playing') {
            const highTier =
                state.sceneTransition?.tier === 'high';
            storyElement.append(createGenerationStatusCard({
                tier: highTier ? 'high' : 'medium',
                eyebrow: highTier
                    ? 'WORLD DIRECTOR · ATOMIC'
                    : 'SCENE DIRECTOR · ATOMIC',
                title: highTier
                    ? staticText(
                        'ui.story.transition.high_title',
                        'High tier is settling a major turn',
                    )
                    : staticText(
                        'ui.story.transition.medium_title',
                        'Medium tier is archiving the Scene and establishing the next one',
                    ),
                detail:
                    staticText(
                        'ui.story.transition.detail',
                        'Structured State commits once after full validation. The old Scene remains playable until then.',
                    ),
                steps: [
                    staticText(
                        'ui.story.transition.step.close',
                        'Close the old Scene',
                    ),
                    staticText(
                        'ui.story.transition.step.people',
                        'Confirm characters and location',
                    ),
                    staticText(
                        'ui.story.transition.step.next',
                        'Prewrite the next Scene',
                    ),
                    staticText(
                        'ui.story.transition.step.commit',
                        'Atomic commit',
                    ),
                ],
                activeStep: 1,
            }));
        } else if (jobRegistry.turnActive && state.phase === 'playing') {
            if (
                state.memoryDirector?.status ===
                    'consolidating'
            ) {
                storyElement.append(createGenerationStatusCard({
                    tier: 'medium',
                    eyebrow: 'MEMORY DIRECTOR · PERIODIC',
                    title:
                        staticText(
                            'ui.story.memory.title',
                            'Medium tier is organizing shared memories',
                        ),
                    detail:
                        staticText(
                            'ui.story.memory.detail',
                            'Merging duplicate moments, distilling recent events, and deciding which experiences leave lasting marks.',
                        ),
                    steps: [
                        staticText(
                            'ui.story.memory.step.review',
                            'Review shared experiences',
                        ),
                        staticText(
                            'ui.story.memory.step.merge',
                            'Merge everyday fragments',
                        ),
                        staticText(
                            'ui.story.memory.step.events',
                            'Distill important events',
                        ),
                        staticText(
                            'ui.story.memory.step.impressions',
                            'Update character impressions',
                        ),
                    ],
                    activeStep: 1,
                }));
            } else if (
                state.pacingDirector?.status === 'assessing'
            ) {
                storyElement.append(createGenerationStatusCard({
                    tier: 'medium',
                    eyebrow: 'PACING DIRECTOR · LIVE CHECK',
                    title:
                        staticText(
                            'ui.story.pacing.title',
                            'Medium tier is checking Scene pacing',
                        ),
                    detail:
                        staticText(
                            'ui.story.pacing.detail',
                            'Deciding whether the Scene needs new characters, a public crisis, or a main-story turn.',
                        ),
                    steps: [
                        staticText(
                            'ui.story.pacing.step.cast',
                            'Check repeated cast',
                        ),
                        staticText(
                            'ui.story.pacing.step.pressure',
                            'Measure Scene pressure',
                        ),
                        staticText(
                            'ui.story.pacing.step.intervention',
                            'Choose intervention',
                        ),
                        staticText(
                            'ui.story.pacing.step.commit',
                            'Commit public turn',
                        ),
                    ],
                    activeStep: 1,
                }));
            } else if (session.liveSceneStream) {
                storyElement.append(renderLiveSceneStream());
            } else {
                storyElement.append(createGenerationStatusCard({
                    tier: 'low',
                    eyebrow: 'ON-SCENE PERFORMER · CONNECTING',
                    title:
                        staticText(
                            'ui.story.performer.title',
                            'Low tier is taking over the Scene',
                        ),
                    detail:
                        staticText(
                            'ui.story.performer.detail',
                            'Reading the player action, spatial relationships, and Director instructions.',
                        ),
                    steps: [
                        staticText(
                            'ui.story.performer.step.read',
                            'Read action',
                        ),
                        staticText(
                            'ui.story.performer.step.write',
                            'Write the Scene',
                        ),
                        staticText(
                            'ui.story.performer.step.translate',
                            'Prepare display translation',
                        ),
                        staticText(
                            'ui.story.performer.step.commit',
                            'Commit State',
                        ),
                    ],
                    activeStep: 0,
                }));
            }
        }
        if (!jobRegistry.sceneTransitionActive &&
            state.sceneTransition?.status === 'failed') {
            const failure = document.createElement('div');
            failure.className = 'hpmud-system-turn hpmud-transition-failure';
            const title = document.createElement('strong');
            const detail = document.createElement('span');
            const retry = document.createElement('button');
            title.textContent =
                staticText(
                    'ui.story.settlement_failed',
                    'Scene settlement failed',
                );
            detail.textContent =
                staticText(
                    'ui.story.settlement_invalid',
                    'The settlement package failed rules validation.',
                );
            retry.type = 'button';
            retry.textContent =
                staticText(
                    'ui.story.settlement_reopen',
                    'Reopen settlement',
                );
            retry.disabled =
                saveRevisionBlocked;
            retry.addEventListener('click', openSceneTransitionDialog);
            failure.append(title, detail, retry);
            storyElement.append(failure);
        }

        const scrollMode =
            resolveStoryScrollMode({
                preserveScrollAnchor,
                initialSceneLoad,
                newAssistantMessageId,
                wasNearBottom,
            });
        if (scrollMode === 'preserve') {
            storyElement.scrollTop += storyElement.scrollHeight - previousHeight;
        } else if (
            scrollMode ===
            'new-assistant-top'
        ) {
            const finalMessage =
                storyElement
                    .querySelector(
                        `[data-message-id="${newAssistantMessageId}"]`,
                    );
            if (finalMessage) {
                storyElement.scrollTop =
                    Math.max(
                        0,
                        finalMessage
                            .offsetTop -
                            16,
                    );
            }
        } else if (scrollMode === 'bottom') {
            storyElement.scrollTop = storyElement.scrollHeight;
        }
    }

    function syncComposerState(state) {
        const pacingDirectorBuilding =
            state.pacingDirector?.status === 'assessing';
        const memoryDirectorBuilding =
            state.memoryDirector?.status ===
                'consolidating';
        const sceneTransitionBuilding = jobRegistry.sceneTransitionActive ||
            state.sceneTransition?.status === 'resolving';
        const failedPlayerTurn =
            getFailedPlayerTurn(
                getContext().chat,
                state.turn,
            );
        const postSettlementPending =
            state.turn?.status ===
            'post_unsettled';
        const saveRevisionBlocked =
            isSaveRevisionBlocked();
        const ready = state.phase === 'playing' &&
            !pacingDirectorBuilding &&
            !memoryDirectorBuilding &&
            !sceneTransitionBuilding &&
            !failedPlayerTurn &&
            !postSettlementPending &&
            !saveRevisionBlocked &&
            !jobRegistry.turnActive;
        const composer = root.querySelector('#hpmud_composer');
        composer.classList.toggle('locked', !ready);
        composer.querySelectorAll('textarea, input, button').forEach(control => {
            control.disabled = !ready;
        });
        const rollbackButton =
            root.querySelector(
                '#hpmud_rollback_turn',
            );
        const rollbackCheckpoint =
            getAvailableTurnRollbackCheckpoint(
                state,
                getContext().chat,
            );
        rollbackButton.disabled =
            !ready;
        const sceneTransitionButton =
            root.querySelector(
                '#hpmud_end_scene',
            );
        if (sceneTransitionButton) {
            sceneTransitionButton
                .disabled =
                saveRevisionBlocked ||
                postSettlementPending;
        }
        rollbackButton.title =
            rollbackCheckpoint
                ? staticText(
                    'ui.story.rollback_title',
                    'Delete the previous player/Scene message pair and restore world State from before that turn',
                )
                : staticText(
                    'ui.story.rollback_legacy_title',
                    'Rollback the previous turn. Old saves rebuild pre-turn State from committed transactions.',
                );
        if (!ready) {
            closeMovementPicker();
            closeSpellPicker();
        }
        composerInput.placeholder = ready
            ? staticText(
                'ui.game.input_placeholder',
                'Write your action, dialogue, or thought...',
            )
            : saveRevisionBlocked
                ? staticText(
                    'ui.story.stale_timeline',
                    SAVE_REVISION_REFRESH_MESSAGE,
                )
                : failedPlayerTurn
                    ? staticText(
                        'ui.story.busy.retry_first',
                        'The previous player message is saved. Retry the turn above first.',
                    )
                    : memoryDirectorBuilding
                        ? staticText(
                            'ui.story.busy.memory',
                            'The medium tier is organizing impressions and shared memories. Please wait.',
                        )
                        : pacingDirectorBuilding
                            ? staticText(
                                'ui.story.busy.pacing',
                                'The medium tier is checking Scene pacing and character changes. Please wait.',
                            )
                            : sceneTransitionBuilding
                                ? staticText(
                                    'ui.story.busy.transition',
                                    'Archiving the current Scene and establishing the next one. Please wait.',
                                )
                                : jobRegistry.turnActive
                                    ? staticText(
                                        'ui.story.busy.performer',
                                        'The low tier is performing this turn. Please wait.',
                                    )
                                    : state.phase === 'initialization_failed'
                                        ? staticText(
                                            'ui.story.busy.opening_failed',
                                            'Opening arrangement failed. Retry above first.',
                                        )
                                        : staticText(
                                            'ui.story.busy.world_setup',
                                            'The world is being established. You can act after the opening is ready.',
                                        );
    }

    return {
        initials,
        getPeopleDisplay,
        renderHeaderAndScene,
        renderSceneArchiveList,
        renderSceneArchiveTranscript,
        openSceneArchive,
        updateSceneDestinationStatus,
        formatNextSceneIntent,
        openSceneTransitionDialog,
        renderStory,
        syncComposerState,
    };
}

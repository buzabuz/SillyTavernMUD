import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';
import {
    createTranslationRowKey,
    hashTranslationSource,
} from '../domain/localization-contract.js';
import {
    getVisibleItemLocalizationFields,
} from '../domain/item-localization.js';
import {
    createSpellLocalizationFields,
} from '../domain/spell-localization.js';
import {
    createActorRoleField,
} from '../domain/actor-display-name.js';

const DISPLAY_LOCALE_STORAGE_KEY =
    'hogwartsMud.displayLocale';

export function createTranslationController(
    ports,
) {
    const {
        enqueueLocalizationCandidates =
        async () => ({
            enqueued: 0,
            skipped: 0,
            errorCode: '',
        }),
        getMudState,
        getSettings,
        idleLocalizationScheduler,
        localizationQueue,
        localizationTable,
        renderAll,
        scheduleRender,
        session,
        setAppScreen,
        storage =
        globalThis.localStorage,
        syncModelSlotControls,
        syncSettingsUi,
    } = ports;
    session.localizationTableErrors ??=
        new Map();

    function fieldTimelineEpoch(
        field,
    ) {
        return String(
            field?.timelineEpoch ||
            getMudState()
                ?.timelineEpoch ||
            '',
        );
    }

    function fieldIdentity(
        field,
        timelineEpoch =
        fieldTimelineEpoch(field),
    ) {
        return JSON.stringify([
            timelineEpoch,
            String(
                field?.recordKind ||
                '',
            ),
            String(
                field?.recordId ||
                '',
            ),
            String(
                field?.fieldPath ||
                '',
            ),
            String(
                field?.sourceTextEn ||
                '',
            ),
        ]);
    }

    async function resolveFieldKey(
        field,
    ) {
        const timelineEpoch =
            fieldTimelineEpoch(
                field,
            );
        const identity =
            fieldIdentity(
                field,
                timelineEpoch,
            );
        const existing =
            session
                .localizationFieldKeys
                .get(identity);
        if (existing) {
            return {
                identity,
                key: existing,
                timelineEpoch,
            };
        }
        const providerId =
            getSettings()
                .translationProvider;
        const sourceTextEn =
            String(
                field?.sourceTextEn ||
                '',
            ).trim();
        if (
            !timelineEpoch ||
            !sourceTextEn ||
            providerId === 'off'
        ) {
            return {
                identity,
                key: '',
                timelineEpoch,
            };
        }
        const sourceHash =
            await hashTranslationSource(
                sourceTextEn,
            );
        const key =
            await createTranslationRowKey({
                timelineEpoch:
                    timelineEpoch,
                recordKind:
                    field.recordKind,
                recordId:
                    String(
                        field.recordId,
                    ),
                fieldPath:
                    field.fieldPath,
                sourceHash,
                sourceLocale: 'en',
                targetLocale: 'zh-CN',
                providerId,
                translatorVersion:
                    Number(
                        field
                            .translatorVersion ||
                        1,
                    ),
                glossaryVersion:
                    Number(
                        field
                            .glossaryVersion ||
                        1,
                    ),
            });
        session.localizationFieldKeys
            .set(
                identity,
                key,
            );
        return {
            identity,
            key,
            timelineEpoch,
        };
    }

    function loadDisplayLocale() {
        let stored = '';
        try {
            stored =
                storage?.getItem(
                    DISPLAY_LOCALE_STORAGE_KEY,
                ) ||
                '';
        } catch {
            stored = '';
        }
        session.displayLocale =
            normalizeDisplayLocale(
                stored,
            );
        return session.displayLocale;
    }

    function setDisplayLocale(
        displayLocale,
    ) {
        const locale =
            normalizeDisplayLocale(
                displayLocale,
            );
        session.displayLocale =
            locale;
        try {
            storage?.setItem(
                DISPLAY_LOCALE_STORAGE_KEY,
                locale,
            );
        } catch {
            // Locale preference is optional.
        }
        syncSettingsUi?.();
        if (
            session.activeScreen ===
            'setup'
        ) {
            syncModelSlotControls?.();
        }
        if (
            typeof setAppScreen ===
            'function'
        ) {
            setAppScreen(
                session.activeScreen,
                {
                    allowAutomaticModelWork:
                        false,
                },
            );
        } else {
            renderAll();
        }
        if (locale === 'zh-CN') {
            idleLocalizationScheduler
                ?.schedule();
        }
        return locale;
    }

    async function queryLocalizedRows(
        keys,
        timelineEpoch =
        String(
            getMudState()
                ?.timelineEpoch ||
            '',
        ),
    ) {
        const uniqueKeys = [
            ...new Set(
                (keys || [])
                    .filter(Boolean),
            ),
        ];
        if (
            session.displayLocale ===
                'en' ||
            !uniqueKeys.length
        ) {
            return {};
        }
        try {
            const response =
                await localizationTable
                    .queryRows(
                        timelineEpoch,
                        uniqueKeys,
                    );
            const rows =
                response.rows ||
                [];
            for (const row of rows) {
                session
                    .localizationRows
                    .set(
                        await createTranslationRowKey(
                            row,
                        ),
                        row,
                    );
            }
            session
                .localizationTableErrors
                .delete(
                    timelineEpoch,
                );
            session
                .localizationLastErrorCode =
                session
                    .localizationTableErrors
                    .values()
                    .next()
                    .value ||
                '';
            if (rows.length) {
                scheduleRender();
            }
            return rows;
        } catch (error) {
            const errorCode =
                String(
                    error?.code ||
                    'TABLE_UNAVAILABLE',
                ).slice(0, 64);
            session
                .localizationTableErrors
                .set(
                    timelineEpoch,
                    errorCode,
                );
            session
                .localizationLastErrorCode =
                errorCode;
            scheduleRender();
            return {};
        }
    }

    async function ensureLocalizedFields(
        fields,
        {
            priority = 1,
        } = {},
    ) {
        if (
            session.displayLocale ===
            'en'
        ) {
            return [];
        }
        const dynamicFields =
            (fields || [])
                .filter(field =>
                    !field?.rawText &&
                    !getStaticLocaleText(
                        field?.staticKey,
                        'zh-CN',
                    ) &&
                    String(
                        field
                            ?.sourceTextEn ||
                        '',
                    ).trim());
        const resolved =
            await Promise.all(
                dynamicFields.map(
                    resolveFieldKey,
                ),
            );
        const keys = resolved
            .map(entry =>
                entry.key)
            .filter(Boolean);
        raiseLocalizationPriority(
            keys,
            priority,
        );
        const queryGroups =
            new Map();
        resolved.forEach(entry => {
            if (
                !entry.key ||
                session
                    .localizationQueriedKeys
                    .has(entry.key)
            ) {
                return;
            }
            session
                .localizationQueriedKeys
                .add(entry.key);
            const timelineKeys =
                queryGroups.get(
                    entry.timelineEpoch,
                ) ||
                [];
            timelineKeys.push(
                entry.key,
            );
            queryGroups.set(
                entry.timelineEpoch,
                timelineKeys,
            );
        });
        await Promise.all(
            [
                ...queryGroups,
            ].map(([
                timelineEpoch,
                timelineKeys,
            ]) =>
                queryLocalizedRows(
                    timelineKeys,
                    timelineEpoch,
                )),
        );
        const queueCandidates =
            await Promise.all(
                resolved.map(async (
                    entry,
                    index,
                ) => {
                    if (
                        !entry.key ||
                        session
                            .localizationRows
                            .has(
                                entry.key,
                            ) ||
                        session
                            .localizationTableErrors
                            .has(
                                entry
                                    .timelineEpoch,
                            )
                    ) {
                        return null;
                    }
                    const field =
                        dynamicFields[
                            index
                        ];
                    const sourceText =
                        String(
                            field
                                ?.sourceTextEn ||
                            '',
                        ).trim();
                    if (!sourceText) {
                        return null;
                    }
                    const providerId =
                        getSettings()
                            .translationProvider;
                    return {
                        key: entry.key,
                        timelineEpoch:
                            entry
                                .timelineEpoch,
                        recordKind:
                            field.recordKind,
                        recordId:
                            String(
                                field
                                    .recordId,
                            ),
                        fieldPath:
                            field
                                .fieldPath,
                        sourceText,
                        sourceHash:
                            await hashTranslationSource(
                                sourceText,
                            ),
                        sourceLocale:
                            'en',
                        targetLocale:
                            'zh-CN',
                        providerId,
                        translatorVersion:
                            Number(
                                field
                                    .translatorVersion ||
                                1,
                            ),
                        glossaryVersion:
                            Number(
                                field
                                    .glossaryVersion ||
                                1,
                            ),
                        priority,
                        changedAt:
                            Number(
                                field
                                    .changedAt ||
                                0,
                            ),
                    };
                }),
            );
        const enqueued =
            queueCandidates
                .filter(Boolean);
        if (enqueued.length) {
            localizationQueue
                ?.enqueue(
                    enqueued,
                );
            idleLocalizationScheduler
                ?.schedule();
        }
        resolved.forEach((entry) => {
            if (!entry.key) {
                return;
            }
            if (
                session
                    .localizationRows
                    .has(entry.key)
            ) {
                session
                    .localizationPendingFields
                    .delete(
                        entry.identity,
                    );
            } else {
                session
                    .localizationPendingFields
                    .add(
                        entry.identity,
                    );
            }
        });
        return keys;
    }

    async function requestFieldRetranslation(
        fields,
        {
            priority = 0,
        } = {},
    ) {
        const dynamicFields =
            (fields || [])
                .filter(field =>
                    !field?.rawText &&
                    String(
                        field
                            ?.sourceTextEn ||
                        '',
                    ).trim());
        const resolved =
            await Promise.all(
                dynamicFields.map(
                    resolveFieldKey,
                ),
            );
        const keysByTimeline =
            new Map();
        resolved.forEach(entry => {
            if (!entry.key) {
                return;
            }
            const keys =
                keysByTimeline.get(
                    entry.timelineEpoch,
                ) ||
                [];
            keys.push(entry.key);
            keysByTimeline.set(
                entry.timelineEpoch,
                keys,
            );
        });
        for (const [
            timelineEpoch,
            keys,
        ] of keysByTimeline) {
            await localizationTable
                .requestRetranslation(
                    timelineEpoch,
                    keys,
                );
            keys.forEach(key => {
                session
                    .localizationRows
                    .delete(key);
                session
                    .localizationQueriedKeys
                    .delete(key);
            });
        }
        await ensureLocalizedFields(
            dynamicFields,
            {
                priority,
            },
        );
        scheduleRender();
        return resolved
            .map(entry =>
                entry.key)
            .filter(Boolean);
    }

    function getLocalizedField(
        field,
    ) {
        const sourceTextEn =
            String(
                field?.sourceTextEn ||
                '',
            );
        const rawText =
            String(
                field?.rawText ||
                '',
            );
        if (rawText) {
            return {
                text: rawText,
                status:
                    'raw_evidence',
                errorCode: '',
                key: '',
            };
        }
        if (
            session.displayLocale ===
            'en'
        ) {
            const staticText =
                getStaticLocaleText(
                    field?.staticKey,
                    'en',
                );
            return {
                text:
                    staticText ||
                    sourceTextEn,
                status:
                    staticText
                        ? 'static'
                        : 'source',
                errorCode: '',
                key: '',
            };
        }
        const staticText =
            getStaticLocaleText(
                field?.staticKey,
                'zh-CN',
            );
        if (staticText) {
            return {
                text: staticText,
                status: 'static',
                errorCode: '',
                key: '',
            };
        }
        if (
            getSettings()
                .translationProvider ===
            'off'
        ) {
            return {
                text: sourceTextEn,
                status: 'source',
                errorCode: '',
                key: '',
            };
        }
        const timelineEpoch =
            fieldTimelineEpoch(
                field,
            );
        if (!timelineEpoch) {
            return {
                text: sourceTextEn,
                status: 'source',
                errorCode: '',
                key: '',
            };
        }
        const identity =
            fieldIdentity(
                field,
                timelineEpoch,
            );
        const key =
            session
                .localizationFieldKeys
                .get(identity) ||
            '';
        const row =
            session
                .localizationRows
                .get(key);
        const tableError =
            session
                .localizationTableErrors
                .get(
                    timelineEpoch,
                ) ||
            '';
        if (
            row?.status === 'ready' &&
            row.targetLocale ===
                'zh-CN' &&
            String(
                row.translatedText ||
                '',
            ).trim()
        ) {
            return {
                text:
                    String(
                        row.translatedText,
                    ),
                status: 'translated',
                errorCode: '',
                key,
            };
        }
        return {
            text: sourceTextEn,
            status:
                row?.status ===
                    'error' ||
                tableError
                    ? 'error'
                    : 'pending',
            errorCode:
                String(
                    row?.errorCode ||
                    tableError ||
                    '',
                ).slice(0, 64),
            key,
        };
    }

    function raiseLocalizationPriority(
        keys,
        priority = 1,
    ) {
        const uniqueKeys = [
            ...new Set(
                (keys || [])
                    .filter(Boolean),
            ),
        ];
        uniqueKeys.forEach(key =>
            session
                .localizationPriorityKeys
                .add(key));
        localizationQueue
            ?.raisePriority(
                uniqueKeys,
                priority,
            );
        idleLocalizationScheduler
            ?.schedule();
    }

    async function requestRetranslation(
        keys,
    ) {
        const timelineEpoch =
            String(
                getMudState()
                    ?.timelineEpoch ||
                '',
            );
        await localizationTable
            .requestRetranslation(
                timelineEpoch,
                keys,
            );
        keys.forEach(key =>
            session
                .localizationRows
                .delete(key));
        await enqueueLocalizationCandidates();
        raiseLocalizationPriority(
            keys,
            0,
        );
    }

    async function translateMessage(
        _messageId,
        {
            force = false,
            message = null,
        } = {},
    ) {
        const mud =
            message?.extra
                ?.hogwartsMud ||
            {};
        const segments =
            (
                mud.segments ||
                []
            );
        const state =
            getMudState() ||
            {};
        const actorById =
            new Map(
                (state.actorLibrary ||
                    [])
                    .map(actor => [
                        actor.id,
                        actor,
                    ]),
            );
        const fields = [
            ...(
                !segments.length &&
                !message?.is_user
                    ? [{
                        recordKind:
                            message?.is_system
                                ? 'system_message'
                                : 'message',
                        recordId:
                            String(
                                _messageId,
                            ),
                        fieldPath: 'mes',
                        sourceTextEn:
                            message?.mes ||
                            '',
                    }]
                    : []
            ),
            ...segments.map((
                segment,
                index,
            ) => ({
                recordKind:
                    'message_segment',
                recordId:
                    `message:${_messageId}:segment:${index}`,
                fieldPath:
                    'textEn',
                sourceTextEn:
                    segment.textEn ||
                    '',
                rawText:
                    segment.rawText ||
                    '',
            })),
            {
                recordKind:
                    'author_quill',
                recordId:
                    String(
                        _messageId,
                    ),
                fieldPath:
                    'authorQuillEn',
                sourceTextEn:
                    mud.authorQuillEn ||
                    '',
            },
            ...[
                ...new Set(
                    segments
                        .filter(segment =>
                            segment.type ===
                                'dialogue' &&
                            segment.actorId)
                        .map(segment =>
                            segment.actorId),
                ),
            ].map(actorId =>
                createActorRoleField(
                    actorId,
                    actorById.get(
                        actorId,
                    )?.roleEn ||
                    '',
                )),
            ...(
                mud.turnTransaction
                    ?.itemCandidates ||
                []
            ).flatMap(candidate =>
                getVisibleItemLocalizationFields(
                    candidate.item,
                )),
            ...(
                mud.turnTransaction
                    ?.spellCandidates ||
                []
            ).flatMap(candidate =>
                createSpellLocalizationFields(
                    candidate
                        .definition,
                )),
        ];
        if (force) {
            return requestFieldRetranslation(
                fields,
                {
                    priority: 0,
                },
            );
        }
        await ensureLocalizedFields(
            fields,
            {
                priority: 0,
            },
        );
        idleLocalizationScheduler
            ?.schedule();
        return [];
    }

    function translateExistingMessages() {
        idleLocalizationScheduler
            ?.schedule();
    }

    function translateCurrentStateAndLatestArchive() {
        idleLocalizationScheduler
            ?.schedule();
    }

    function refreshTranslationsForProvider() {
        session.localizationRows
            .clear();
        session.localizationFieldKeys
            .clear();
        session.localizationQueriedKeys
            .clear();
        session.localizationPendingFields
            .clear();
        session.localizationTableErrors
            .clear();
        session
            .localizationLastErrorCode =
            '';
        idleLocalizationScheduler
            ?.schedule();
    }

    function clearDisplayTranslations() {
        session.localizationRows
            .clear();
        session.localizationFieldKeys
            .clear();
        session.localizationQueriedKeys
            .clear();
        session.localizationPendingFields
            .clear();
        session.localizationTableErrors
            .clear();
        session
            .localizationLastErrorCode =
            '';
        session
            .localizationVisiblePending
            .clear();
        scheduleRender();
    }

    globalThis.addEventListener?.(
        'hogwarts-mud-localization-rows',
        event => {
            (
                event?.detail ||
                []
            ).forEach(entry => {
                if (
                    entry?.key &&
                    entry?.row
                ) {
                    session
                        .localizationRows
                        .set(
                            entry.key,
                            entry.row,
                        );
                    for (const [
                        identity,
                        key,
                    ] of session
                            .localizationFieldKeys
                            .entries()) {
                        if (
                            key ===
                            entry.key
                        ) {
                            session
                                .localizationPendingFields
                                .delete(
                                    identity,
                                );
                        }
                    }
                }
            });
            scheduleRender();
        },
    );

    loadDisplayLocale();

    return {
        loadDisplayLocale,
        setDisplayLocale,
        queryLocalizedRows,
        ensureLocalizedFields,
        getLocalizedField,
        raiseLocalizationPriority,
        requestRetranslation,
        requestFieldRetranslation,
        translateMessage,
        translateExistingMessages,
        translateCurrentStateAndLatestArchive,
        refreshTranslationsForProvider,
        clearDisplayTranslations,
    };
}

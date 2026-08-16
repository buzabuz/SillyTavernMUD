import {
    createItemCard,
    createItemLedger,
} from './item-components.js';
import {
    getIdentitySourceLabel,
} from './npc-identity-dossier.js';
import {
    buildActorDossierViewModel,
} from '../domain/actor-dossier-projection.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from '../domain/localized-view-model.js';
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

export function createInspectorController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        createItemReferenceDirective,
        ensureLocalizedFields =
        async () => [],
        getKnownSpellMap,
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
        getRoomName,
        getSpellDefinition,
        getSpellProficiency,
        getWorldState,
        initials,
        insertAtCursor,
        projectItemLedger,
        requestFieldRetranslation =
        async () => [],
        renderInspectorMap,
        setComposerSpell,
    } = ports;

    const {
        root,
        inspectorElement,
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

    function createInspectorCard(title, content) {
        const card = document.createElement('section');
        card.className = 'hpmud-inspector-card';
        if (title) {
            const heading = document.createElement('h3');
            heading.textContent = title;
            card.append(heading);
        }
        card.append(content);
        return card;
    }

    function createList(
        entries,
        emptyText =
        staticText(
            'ui.inspector.empty',
            'None yet',
        ),
    ) {
        const list = document.createElement('ul');
        list.className = 'hpmud-inspector-list';
        if (!entries.length) {
            const item = document.createElement('li');
            item.textContent = emptyText;
            list.append(item);
            return list;
        }
        for (const entry of entries) {
            const item = document.createElement('li');
            if (typeof entry === 'string') {
                item.textContent = entry;
            } else {
                const label =
                    document.createElement(
                        'span',
                    );
                label.className =
                    'hpmud-inspector-entry-label';
                label.textContent =
                    entry.label ||
                    entry.name ||
                    '';
                item.append(label);
                const sourceLabel =
                    getIdentitySourceLabel(
                        entry.sourceKind,
                        session
                            .displayLocale,
                    );
                if (sourceLabel) {
                    const source =
                        document.createElement(
                            'span',
                        );
                    source.className =
                        `hpmud-identity-source is-${entry.sourceKind}`;
                    source.textContent =
                        sourceLabel;
                    item.append(source);
                }
                if (entry.detail) {
                    const detail = document.createElement('small');
                    detail.textContent = entry.detail;
                    item.append(detail);
                }
            }
            list.append(item);
        }
        return list;
    }

    function createLocalizationStatus(
        fields,
        className,
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
                'div',
            );
        control.className =
            `${className}-control`;
        const indicator =
            document.createElement(
                'small',
            );
        indicator.className =
            className;
        indicator.classList.toggle(
            'is-visible',
            Boolean(status),
        );
        indicator.classList.toggle(
            'is-error',
            status === 'error',
        );
        indicator.textContent =
            status
                ? getLocalizedField({
                    staticKey:
                        status ===
                            'error'
                            ? 'translation.status.partial_error'
                            : 'translation.status.pending',
                    sourceTextEn:
                        status === 'error'
                            ? 'Some fields are showing English source'
                            : 'Translating',
                }).text
                : '\u00a0';
        control.append(indicator);
        if (status === 'error') {
            const retry =
                document.createElement(
                    'button',
                );
            retry.type = 'button';
            retry.className =
                'hpmud-dossier-localization-retry';
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
                    const errorFields =
                        (fields || [])
                            .filter(field =>
                                getLocalizedField(
                                    field,
                                ).status ===
                                    'error');
                    try {
                        await requestFieldRetranslation(
                            errorFields,
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
            control.append(retry);
        }
        return control;
    }

    function needsTranslation(
        value,
    ) {
        return /[A-Za-z]/u.test(
            String(
                value ||
                '',
            ),
        );
    }

    function localizeIdentity(
        identity,
        actorId,
    ) {
        const localized =
            structuredClone(
                identity,
            );
        const fields = [];
        localized.groups
            .forEach(group => {
                group.entries
                    .forEach((
                        entry,
                        index,
                    ) => {
                        for (const key of [
                            'value',
                            'detail',
                        ]) {
                            if (
                                !needsTranslation(
                                    entry[key],
                                )
                            ) {
                                continue;
                            }
                            const field = {
                                recordKind:
                                    'actor_identity',
                                recordId:
                                    actorId,
                                fieldPath:
                                    `groups.${group.id}.entries[${index}].${key}`,
                                sourceTextEn:
                                    entry[key],
                            };
                            fields.push(
                                field,
                            );
                            entry[key] =
                                getLocalizedField(
                                    field,
                                ).text;
                        }
                    });
            });
        localized.claims
            .forEach((
                claim,
                index,
            ) => {
                for (const key of [
                    'label',
                    'detail',
                ]) {
                    if (
                        !needsTranslation(
                            claim[key],
                        )
                    ) {
                        continue;
                    }
                    const field = {
                        recordKind:
                            'actor_identity',
                        recordId:
                            actorId,
                        fieldPath:
                            `claims[${index}].${key}`,
                        sourceTextEn:
                            claim[key],
                    };
                    fields.push(
                        field,
                    );
                    claim[key] =
                        getLocalizedField(
                            field,
                        ).text;
                }
            });
        return {
            fields,
            identity:
                localized,
        };
    }

    function localizeGenericEntries(
        recordKind,
        entries,
    ) {
        const fields = [];
        const localized =
            (entries || [])
                .map((
                    entry,
                    index,
                ) => {
                    const recordId =
                        String(
                            entry?.id ||
                            `${recordKind}:${index}`,
                        );
                    if (
                        typeof entry ===
                            'string'
                    ) {
                        const field = {
                            recordKind,
                            recordId,
                            fieldPath:
                                'textEn',
                            sourceTextEn:
                                entry,
                        };
                        fields.push(
                            field,
                        );
                        return getLocalizedField(
                            field,
                        ).text;
                    }
                    const labelSource =
                        entry?.nameEn ||
                        entry?.titleEn ||
                        entry?.labelEn ||
                        entry?.name ||
                        entry?.title ||
                        entry?.label ||
                        '';
                    const detailSource =
                        entry
                            ?.summaryEn ||
                        entry
                            ?.descriptionEn ||
                        entry?.detailEn ||
                        entry?.summary ||
                        entry
                            ?.description ||
                        entry?.detail ||
                        '';
                    const labelField = {
                        recordKind,
                        recordId,
                        fieldPath:
                            entry?.nameEn
                                ? 'nameEn'
                                : entry?.titleEn
                                    ? 'titleEn'
                                    : 'labelEn',
                        sourceTextEn:
                            labelSource,
                    };
                    const detailField = {
                        recordKind,
                        recordId,
                        fieldPath:
                            entry?.summaryEn
                                ? 'summaryEn'
                                : entry
                                    ?.descriptionEn
                                    ? 'descriptionEn'
                                    : 'detailEn',
                        sourceTextEn:
                            detailSource,
                    };
                    fields.push(
                        labelField,
                        detailField,
                    );
                    return {
                        ...entry,
                        label:
                            getLocalizedField(
                                labelField,
                            ).text,
                        detail:
                            getLocalizedField(
                                detailField,
                            ).text,
                    };
                });
        return {
            fields,
            entries:
                localized,
        };
    }

    function renderMemoryLedger(memories) {
        const ledger = document.createElement('div');
        ledger.className = 'hpmud-memory-ledger';
        const memoryFields =
            Object.values(
                memories || {},
            )
                .flat()
                .map(memory => ({
                    recordKind:
                        memory.recordType,
                    recordId:
                        memory.recordId,
                    fieldPath:
                        'summaryEn',
                    sourceTextEn:
                        memory.summary,
                }));
        void Promise.resolve(
            ensureLocalizedFields(
                memoryFields,
                {
                    priority: 1,
                },
            ),
        ).catch(error =>
            console.warn(
                '[Hogwarts MUD] Actor memory localization query failed',
                error,
            ));
        ledger.append(
            createLocalizationStatus(
                memoryFields,
                'hpmud-dossier-localization-status',
            ),
        );
        const tiers = [
            {
                id: 'core',
                label:
                    staticText(
                        'ui.inspector.memory.core',
                        'Most memorable',
                    ),
                hint:
                    staticText(
                        'ui.inspector.memory.core_hint',
                        'Long-term retention',
                    ),
            },
            {
                id: 'recent',
                label:
                    staticText(
                        'ui.inspector.memory.recent',
                        'Recent events',
                    ),
                hint:
                    staticText(
                        'ui.inspector.memory.recent_hint',
                        'Still shaping the present',
                    ),
            },
            {
                id: 'everyday',
                label:
                    staticText(
                        'ui.inspector.memory.everyday',
                        'Everyday moments',
                    ),
                hint:
                    staticText(
                        'ui.inspector.memory.everyday_hint',
                        'Details left by time together',
                    ),
            },
        ];
        tiers.forEach(tier => {
            const entriesForTier =
                memories[tier.id] || [];
            const section = document.createElement('section');
            section.className =
                `hpmud-memory-tier tier-${tier.id}`;
            const header = document.createElement('header');
            const title = document.createElement('strong');
            const count = document.createElement('span');
            const hint = document.createElement('small');
            title.textContent = tier.label;
            count.textContent = String(entriesForTier.length);
            hint.textContent = tier.hint;
            header.append(title, count, hint);
            const entries = document.createElement('div');
            entries.className = 'hpmud-memory-entries';
            if (!entriesForTier.length) {
                const empty = document.createElement('p');
                empty.className = 'hpmud-memory-empty';
                empty.textContent =
                    tier.id === 'core'
                        ? staticText(
                            'ui.inspector.memory.empty_core',
                            'No shared experience has left a lasting mark yet.',
                        )
                        : staticText(
                            'ui.inspector.memory.empty_tier',
                            'No records in this tier yet.',
                        );
                entries.append(empty);
            } else {
                [...entriesForTier].reverse().forEach(memory => {
                    const entry = document.createElement('article');
                    const summary = document.createElement('p');
                    const time = document.createElement('time');
                    summary.textContent =
                        getLocalizedField({
                            recordKind:
                                memory
                                    .recordType,
                            recordId:
                                memory
                                    .recordId,
                            fieldPath:
                                'summaryEn',
                            sourceTextEn:
                                memory.summary,
                        }).text;
                    time.textContent =
                        [
                            memory.sourceBadge,
                            memory.clock,
                        ].filter(Boolean)
                            .join(' · ') ||
                        staticText(
                            'ui.inspector.memory.time_unknown',
                            'Time not recorded',
                        );
                    entry.append(summary, time);
                    entries.append(entry);
                });
            }
            section.append(header, entries);
            ledger.append(section);
        });
        return ledger;
    }

    function renderRelationship(relationship) {
        const panel =
            document.createElement('div');
        panel.className =
            'hpmud-dossier-relationship';
        const subsection = (
            title,
            content,
        ) => {
            const section =
                document.createElement(
                    'section',
                );
            section.className =
                'hpmud-relationship-subsection';
            const heading =
                document.createElement(
                    'h4',
                );
            heading.textContent = title;
            section.append(
                heading,
                content,
            );
            return section;
        };
        const labels =
            document.createElement('div');
        labels.className =
            'hpmud-tags';
        relationship.labels
            .forEach(label => {
                const tag =
                    document.createElement(
                        'span',
                    );
                tag.textContent = label;
                labels.append(tag);
            });
        const dimensions = [
            'familiarity',
            'closeness',
            'warmth',
            'trust',
            'respect',
            'influence',
            'tension',
            'resentment',
            'fear',
            'protectiveness',
        ];
        const metricList =
            createList(
                dimensions.map(
                    key => ({
                        label:
                            staticText(
                                `ui.inspector.dimension.${key}`,
                                key,
                            ),
                        detail: String(
                            Math.round(
                                Number(
                                    relationship
                                        .dimensions[
                                            key
                                        ] || 0,
                                ),
                            ),
                        ),
                    }),
                ),
            );
        const impressions =
            createList([
                {
                    label:
                        staticText(
                            'ui.inspector.first_impression',
                            'First impression',
                        ),
                    detail:
                        relationship
                            .firstImpression
                            ?.summary ||
                        staticText(
                            'ui.inspector.first_impression_empty',
                            'No first-impression record.',
                        ),
                },
                {
                    label:
                        staticText(
                            'ui.inspector.current_schema',
                            'Current view',
                        ),
                    detail:
                        relationship
                            .currentSchema
                            ?.interpretation ||
                        staticText(
                            'ui.inspector.current_schema_empty',
                            'No stable view has formed.',
                        ),
                },
                {
                    label:
                        staticText(
                            'ui.inspector.expectation',
                            'Behavioral expectation',
                        ),
                    detail:
                        relationship
                            .currentSchema
                            ?.expectation ||
                        staticText(
                            'ui.inspector.expectation_empty',
                            'No stable expectation.',
                        ),
                },
                relationship
                    .currentSchema
                    ? {
                        label:
                            staticText(
                                'ui.inspector.schema_basis',
                                'Schema basis',
                            ),
                        detail:
                            `${Math.round(
                                relationship
                                    .currentSchema
                                    .confidence *
                                100,
                            )}% · ` +
                            `${staticText(
                                `ui.inspector.schema_status.${relationship.currentSchema.status}`,
                                relationship
                                    .currentSchema
                                    .status,
                            )} · ` +
                            formatStaticText(
                                'ui.inspector.schema_counts',
                                '{supporting} supporting · {counterexamples} counterexamples',
                                {
                                    supporting:
                                        relationship
                                            .currentSchema
                                            .supportingCount,
                                    counterexamples:
                                        relationship
                                            .currentSchema
                                            .counterexampleCount,
                                },
                            ),
                    }
                    : null,
            ].filter(Boolean));
        const sentiments =
            relationship
                .activeSentiments
                .map(sentiment => ({
                    label:
                        staticText(
                            `ui.inspector.emotion.${sentiment.emotion}`,
                            sentiment.emotion,
                        ) ||
                        staticText(
                            'ui.inspector.short_sentiment',
                            'Short-term emotion',
                        ),
                    detail:
                        String(
                            sentiment
                                .intensity ??
                            '',
                        ),
                }));
        const evidence =
            relationship
                .evidenceRefs
                .map(reference => ({
                    label:
                        [
                            staticText(
                                'ui.inspector.relationship_evidence',
                                'Relationship evidence',
                            ),
                            reference.clock,
                        ].filter(Boolean)
                            .join(' · '),
                    detail:
                        reference.summary,
                }));
        panel.append(
            labels,
            subsection(
                staticText(
                    'ui.inspector.impressions',
                    'Impressions and expectations',
                ),
                impressions,
            ),
            subsection(
                staticText(
                    'ui.inspector.relationship_dimensions',
                    'Relationship dimensions',
                ),
                metricList,
            ),
            subsection(
                staticText(
                    'ui.inspector.current_emotions',
                    'Current emotions',
                ),
                createList(
                    sentiments,
                    staticText(
                        'ui.inspector.current_emotions_empty',
                        'No active emotions.',
                    ),
                ),
            ),
            subsection(
                staticText(
                    'ui.inspector.relationship_evidence',
                    'Relationship evidence',
                ),
                createList(
                    evidence,
                    staticText(
                        'ui.inspector.relationship_evidence_empty',
                        'No player-visible relationship evidence.',
                    ),
                ),
            ),
        );
        return panel;
    }

    function renderIdentity(identity) {
        const panel =
            document.createElement('div');
        panel.className =
            'hpmud-dossier-identity';
        identity.groups
            .forEach(group => {
                const heading =
                    document.createElement(
                        'h4',
                    );
                heading.textContent =
                    group.title;
                panel.append(
                    heading,
                    createList(
                        group.entries
                            .map(entry => ({
                                label:
                                    entry.label,
                                detail:
                                    [
                                        entry.value,
                                        entry.detail,
                                    ].filter(Boolean)
                                        .join(' · '),
                                sourceKind:
                                    entry
                                        .sourceKind,
                            })),
                        group.emptyText ||
                        staticText(
                            'ui.inspector.empty',
                            'None yet',
                        ),
                    ),
                );
            });
        const claimsHeading =
            document.createElement('h4');
        claimsHeading.textContent =
            staticText(
                'ui.inspector.relationship_claims',
                'Relationship claims',
            );
        panel.append(
            claimsHeading,
            createList(
                identity.claims,
                staticText(
                    'ui.inspector.relationship_claims_empty',
                    'No known relationship claims.',
                ),
            ),
        );
        return panel;
    }

    function renderInspector(tab = 'character') {
        const state = getWorldState();
        const character = state.character;
        inspectorElement.replaceChildren();
        root.querySelector(
            '.hpmud-inspector-tabs',
        )?.setAttribute?.(
            'aria-label',
            staticText(
                'ui.inspector.tabs_aria',
                'Inspector',
            ),
        );
        root.querySelectorAll('[data-hpmud-tab]').forEach(button => {
            button.textContent =
                staticText(
                    `ui.inspector.tab.${button.dataset.hpmudTab}`,
                    button.dataset
                        .hpmudTab,
                );
            button.classList.toggle('active', button.dataset.hpmudTab === tab);
        });

        if (tab === 'actor') {
            const dossier =
                buildActorDossierViewModel(
                    state,
                    session.selectedActorId,
                    'player',
                    {
                        getRoomName,
                        getLocalizedField,
                        displayLocale:
                            session
                                .displayLocale,
                    },
                );
            if (!dossier) {
                session.selectedActorId = '';
                renderInspector('character');
                return;
            }
            const actorFields = {
                background: {
                    recordKind:
                        'actor_core',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'publicProfile.backgroundEn',
                    sourceTextEn:
                        dossier.core
                            .publicBackground,
                },
                personality: {
                    recordKind:
                        'actor_core',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'performanceCore.temperamentEn',
                    sourceTextEn:
                        dossier.core
                            .personality,
                },
                speechStyle: {
                    recordKind:
                        'actor_core',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'performanceCore.speechStyleEn',
                    sourceTextEn:
                        dossier.core
                            .speechStyle,
                },
                visibleDescription: {
                    recordKind:
                        'actor_core',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'publicProfile.descriptionEn',
                    sourceTextEn:
                        dossier.core
                            .visibleDescription,
                },
                activity: {
                    recordKind:
                        'actor_runtime',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'currentActivityEn',
                    sourceTextEn:
                        dossier.current
                            .activity,
                },
                intent: {
                    recordKind:
                        'actor_runtime',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'currentIntentEn',
                    sourceTextEn:
                        dossier.current
                            .intent,
                },
                lifeStatusDetail: {
                    recordKind:
                        'actor_runtime',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'lifeStatusDetailEn',
                    sourceTextEn:
                        dossier.current
                            .lifeStatusDetail,
                },
                outfit: {
                    recordKind:
                        'actor_presentation',
                    recordId:
                        dossier.actorId,
                    fieldPath:
                        'outfitEn',
                    sourceTextEn:
                        dossier.current
                            .presentation
                            .outfit,
                },
            };
            const firstImpressionField =
                dossier.relationship
                    .firstImpression
                    ? {
                        recordKind:
                            'appraisal',
                        recordId:
                            dossier
                                .relationship
                                .firstImpression
                                .recordId,
                        fieldPath:
                            'summaryEn',
                        sourceTextEn:
                            dossier
                                .relationship
                                .firstImpression
                                .summary,
                    }
                    : null;
            const identityLocalization =
                localizeIdentity(
                    dossier.identity,
                    dossier.actorId,
                );
            const schemaFields =
                dossier.relationship
                    .currentSchema
                    ? {
                        interpretation: {
                            recordKind:
                                'person_schema',
                            recordId:
                                dossier
                                    .relationship
                                    .currentSchema
                                    .schemaId,
                            fieldPath:
                                'interpretationEn',
                            sourceTextEn:
                                dossier
                                    .relationship
                                    .currentSchema
                                    .interpretation,
                        },
                        expectation: {
                            recordKind:
                                'person_schema',
                            recordId:
                                dossier
                                    .relationship
                                    .currentSchema
                                    .schemaId,
                            fieldPath:
                                'expectationEn',
                            sourceTextEn:
                                dossier
                                    .relationship
                                    .currentSchema
                                    .expectation,
                        },
                    }
                    : null;
            const relationshipEvidenceFields =
                dossier.relationship
                    .evidenceRefs
                    .map(reference => ({
                        recordKind:
                            reference
                                .sourceRecordType ||
                            'relationship_evidence',
                        recordId:
                            reference
                                .sourceRecordId ||
                            reference
                                .recordId,
                        fieldPath:
                            'summaryEn',
                        sourceTextEn:
                            reference.summary,
                    }));
            const presentationAccessoryFields =
                dossier.current
                    .presentation
                    .accessories
                    .map((
                        value,
                        index,
                    ) => ({
                        recordKind:
                            'actor_presentation',
                        recordId:
                            dossier.actorId,
                        fieldPath:
                            `accessories[${index}]`,
                        sourceTextEn:
                            value,
                    }));
            const itemSourceById =
                new Map(
                    (state.items || [])
                        .map(item => [
                            item.id,
                            item,
                        ]),
                );
            const itemFieldsById =
                new Map(
                    dossier.items
                        .map(item => {
                            const source =
                                itemSourceById
                                    .get(
                                        item.id,
                                    ) ||
                                {};
                            return [
                                item.id,
                                {
                                    label: {
                                        recordKind:
                                            'item',
                                        recordId:
                                            item.id,
                                        fieldPath:
                                            'labelEn',
                                        sourceTextEn:
                                            source
                                                .labelEn ||
                                            item.label,
                                    },
                                    appearance: {
                                        recordKind:
                                            'item',
                                        recordId:
                                            item.id,
                                        fieldPath:
                                            'appearanceEn',
                                        sourceTextEn:
                                            source
                                                .appearanceEn ||
                                            item.appearance,
                                    },
                                },
                            ];
                        }),
                );
            const dossierFields = [
                ...Object.values(
                    actorFields,
                ),
                ...identityLocalization
                    .fields,
                ...(
                    schemaFields
                        ? Object.values(
                            schemaFields,
                        )
                        : []
                ),
                ...relationshipEvidenceFields,
                ...presentationAccessoryFields,
                ...(
                    firstImpressionField
                        ? [
                            firstImpressionField,
                        ]
                        : []
                ),
                ...[
                    ...itemFieldsById
                        .values(),
                ].flatMap(fields =>
                    Object.values(
                        fields,
                    )),
            ];
            void Promise.resolve(
                ensureLocalizedFields(
                    dossierFields,
                    {
                        priority: 1,
                    },
                ),
            ).catch(error =>
                console.warn(
                    '[Hogwarts MUD] Actor Dossier localization query failed',
                    error,
                ));
            const display =
                key =>
                    getLocalizedField(
                        actorFields[key],
                    ).text;
            inspectorElement.append(
                createLocalizationStatus(
                    dossierFields,
                    'hpmud-dossier-localization-status',
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.actor.core',
                        'Character core',
                    ),
                    createList([
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.public_background',
                                    'Public background',
                                ),
                            detail:
                                display(
                                    'background',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.public_background_empty',
                                    'No public background.',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.personality',
                                    'Personality',
                                ),
                            detail:
                                display(
                                    'personality',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.personality_empty',
                                    'No personality record.',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.speech',
                                    'Speech style',
                                ),
                            detail:
                                display(
                                    'speechStyle',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.speech_empty',
                                    'No speech-style record.',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.appearance',
                                    'Visible appearance',
                                ),
                            detail:
                                display(
                                    'visibleDescription',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.appearance_empty',
                                    'No appearance record.',
                                ),
                        },
                    ]),
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.actor.identity',
                        'Identity and known claims',
                    ),
                    renderIdentity(
                        identityLocalization
                            .identity,
                    ),
                ),
            );
            const presentation =
                dossier.current
                    .presentation;
            const itemLabelById =
                new Map(
                    dossier.items
                        .map(item => [
                            item.id,
                            getLocalizedField(
                                itemFieldsById
                                    .get(
                                        item.id,
                                    )
                                    .label,
                            ).text ||
                            item.label,
                        ]),
                );
            const currentPresentation = [
                display('outfit')
                    ? {
                        label:
                            staticText(
                                'ui.inspector.actor.outfit',
                                'Outfit',
                            ),
                        detail:
                            display(
                                'outfit',
                            ),
                    }
                    : null,
                presentation.wornItemIds
                    .length
                    ? {
                        label:
                            staticText(
                                'ui.inspector.actor.worn_items',
                                'Worn Items',
                            ),
                        detail:
                            presentation
                                .wornItemIds
                                .map(id =>
                                    itemLabelById
                                        .get(id))
                                .filter(Boolean)
                                .join(' · '),
                    }
                    : null,
                presentation.accessories
                    .length
                    ? {
                        label:
                            staticText(
                                'ui.inspector.actor.accessories',
                                'Hats and accessories',
                            ),
                        detail:
                            presentation
                                .accessories
                                .map((
                                    _value,
                                    index,
                                ) =>
                                    getLocalizedField(
                                        presentationAccessoryFields[
                                            index
                                        ],
                                    ).text)
                                .filter(Boolean)
                                .join(' · '),
                    }
                    : null,
                presentation.heldItemIds
                    .length
                    ? {
                        label:
                            staticText(
                                'ui.inspector.actor.held_items',
                                'Held Items',
                            ),
                        detail:
                            presentation
                                .heldItemIds
                                .map(id =>
                                    itemLabelById
                                        .get(id))
                                .filter(Boolean)
                                .join(' · '),
                    }
                    : null,
            ].filter(Boolean);
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.actor.current_status',
                        'Current status',
                    ),
                    createList([
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.location',
                                    'Location',
                                ),
                            detail:
                                dossier.current
                                    .location ||
                                staticText(
                                    'map.location.unknown',
                                    'Unknown location',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.activity',
                                    'Current activity',
                                ),
                            detail:
                                display(
                                    'activity',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.activity_empty',
                                    'No current activity record.',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.intent',
                                    'Current intent',
                                ),
                            detail:
                                display(
                                    'intent',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.intent_empty',
                                    'No current intent record.',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.life_status',
                                    'Life status',
                                ),
                            detail:
                                getLocalizedField({
                                    staticKey:
                                        `actor.life_status.${dossier.current.lifeStatus}`,
                                    sourceTextEn:
                                        dossier.current
                                            .lifeStatus,
                                }).text ||
                                dossier.current
                                    .lifeStatus ||
                                staticText(
                                    'ui.dossier.unknown',
                                    'Unknown',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.actor.status_detail',
                                    'Status detail',
                                ),
                            detail:
                                display(
                                    'lifeStatusDetail',
                                ) ||
                                staticText(
                                    'ui.inspector.actor.status_detail_empty',
                                    'No status detail.',
                                ),
                        },
                        ...currentPresentation,
                    ]),
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.actor.relationship',
                        'Relationship to you',
                    ),
                    renderRelationship(
                        {
                            ...dossier
                                .relationship,
                            currentSchema:
                                dossier
                                    .relationship
                                    .currentSchema
                                    ? {
                                        ...dossier
                                            .relationship
                                            .currentSchema,
                                        interpretation:
                                            getLocalizedField(
                                                schemaFields
                                                    .interpretation,
                                            ).text,
                                        expectation:
                                            getLocalizedField(
                                                schemaFields
                                                    .expectation,
                                            ).text,
                                    }
                                    : null,
                            evidenceRefs:
                                dossier
                                    .relationship
                                    .evidenceRefs
                                    .map((
                                        reference,
                                        index,
                                    ) => ({
                                        ...reference,
                                        summary:
                                            getLocalizedField(
                                                relationshipEvidenceFields[
                                                    index
                                                ],
                                            ).text,
                                    })),
                            firstImpression:
                                dossier
                                    .relationship
                                    .firstImpression
                                    ? {
                                        ...dossier
                                            .relationship
                                            .firstImpression,
                                        summary:
                                            getLocalizedField(
                                                firstImpressionField,
                                            ).text,
                                    }
                                    : null,
                        },
                    ),
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.actor.memories',
                        'Shared experiences',
                    ),
                    renderMemoryLedger(
                        dossier.memories,
                    ),
                ),
            );
            const itemList =
                document.createElement(
                    'div',
                );
            itemList.className =
                'hpmud-item-grid hpmud-actor-item-grid';
            if (dossier.items.length) {
                dossier.items
                    .forEach(item =>
                        itemList.append(
                            createItemCard(
                                {
                                    ...item,
                                    label:
                                        getLocalizedField(
                                            itemFieldsById
                                                .get(
                                                    item.id,
                                                )
                                                .label,
                                        ).text ||
                                        item.label,
                                    appearance:
                                        getLocalizedField(
                                            itemFieldsById
                                                .get(
                                                    item.id,
                                                )
                                                .appearance,
                                        ).text ||
                                        item
                                            .appearance,
                                },
                                {
                                    compact:
                                        true,
                                    displayLocale:
                                        session
                                            .displayLocale,
                                },
                            ),
                        ));
            } else {
                itemList.append(
                    createList(
                        [],
                        staticText(
                            'ui.inspector.actor.items_empty',
                            'No player-visible formal Items.',
                        ),
                    ),
                );
            }
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.actor.items',
                        'Formal Items',
                    ),
                    itemList,
                ),
            );
            return;
        }

        if (tab === 'character') {
            const evidence =
                character
                    ?.inputEvidence ||
                {};
            const identity =
                evidence.identity ||
                {};
            const background =
                evidence.background ||
                {};
            const aptitudes =
                evidence.aptitudes ||
                {};
            const characterFields = {
                name:
                    createCharacterInputLocalizationField(
                        'identity.name',
                        identity.name,
                    ),
                desire:
                    createCharacterInputLocalizationField(
                        'background.desire',
                        background
                            .desire,
                    ),
                fear:
                    createCharacterInputLocalizationField(
                        'background.fear',
                        background
                            .fear,
                    ),
            };
            void Promise.resolve(
                ensureLocalizedFields(
                    Object.values(
                        characterFields,
                    ),
                    {
                        priority: 1,
                    },
                ),
            ).catch(() => {});
            const displayName =
                getLocalizedField(
                    characterFields.name,
                ).text ||
                staticText(
                    'ui.inspector.character.unnamed',
                    'Unnamed character',
                );
            const profile = document.createElement('div');
            profile.className = 'hpmud-profile';
            profile.innerHTML = `
            <span class="hpmud-profile-avatar">${initials(displayName)}</span>
            <span><h2></h2><p></p></span>
        `;
            profile.querySelector('h2').textContent =
                displayName;
            profile.querySelector('p').textContent = [
                background.bloodStatus,
                aptitudes.strongDomain &&
                    formatStaticText(
                        'ui.inspector.character.strength',
                        'Strength: {value}',
                        {
                            value:
                                aptitudes
                                    .strongDomain,
                        },
                    ),
            ].filter(Boolean).join(' · ') ||
                staticText(
                    'ui.inspector.character.first_year',
                    'First-year student',
                );
            inspectorElement.append(createInspectorCard('', profile));

            const tags = document.createElement('div');
            tags.className = 'hpmud-tags';
            Object.entries(character?.attributes || {}).forEach(([key, value]) => {
                const tag = document.createElement('span');
                tag.textContent =
                    `${staticText(
                        `ui.inspector.attribute.${key}`,
                        key,
                    )} ${value}`;
                tags.append(tag);
            });
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.character.attributes',
                        'Base attributes',
                    ),
                    tags,
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.character.background',
                        'Character background',
                    ),
                    createList([
                        {
                            label:
                                staticText(
                                    'ui.inspector.character.desire',
                                    'Desire',
                                ),
                            detail:
                                getLocalizedField(
                                    characterFields
                                        .desire,
                                ).text ||
                                staticText(
                                    'ui.inspector.unrecorded',
                                    'Not recorded',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.character.fear',
                                    'Fear',
                                ),
                            detail:
                                getLocalizedField(
                                    characterFields
                                        .fear,
                                ).text ||
                                staticText(
                                    'ui.inspector.unrecorded',
                                    'Not recorded',
                                ),
                        },
                    ]),
                ),
            );
            return;
        }

        if (tab === 'map') {
            renderInspectorMap(state);
            return;
        }

        if (tab === 'spells') {
            const knownById =
                getKnownSpellMap(
                    state,
                );
            const knownEntries = [
                ...knownById
                    .values(),
            ]
                .sort((left, right) =>
                    right
                        .proficiencyXp -
                    left
                        .proficiencyXp);
            const spellFieldsById =
                new Map(
                    knownEntries
                        .map(entry => {
                            const spell =
                                getSpellDefinition(
                                    entry
                                        .spellId,
                                    state,
                                );
                            return [
                                entry
                                    .spellId,
                                createSpellLocalizationFields(
                                    spell,
                                ),
                            ];
                        }),
                );
            const spellFields = [
                ...spellFieldsById
                    .values(),
            ].flatMap(fields =>
                fields);
            void Promise.resolve(
                ensureLocalizedFields(
                    spellFields,
                    {
                        priority: 1,
                    },
                ),
            ).catch(error =>
                console.warn(
                    '[Hogwarts MUD] Spellbook localization query failed',
                    error,
                ));
            inspectorElement.append(
                createLocalizationStatus(
                    spellFields,
                    'hpmud-dossier-localization-status',
                ),
            );
            const ledger =
                document.createElement(
                    'div',
                );
            ledger.className =
                'hpmud-spellbook-ledger';
            if (!knownById.size) {
                const empty =
                    document.createElement(
                        'p',
                    );
                empty.className =
                    'hpmud-memory-empty';
                empty.textContent =
                    staticText(
                        'ui.inspector.spells.empty',
                        'No learned spells yet. Classes, self-study, and experiments appear here.',
                    );
                ledger.append(empty);
            } else {
                knownEntries
                    .forEach(entry => {
                        const spell =
                            getSpellDefinition(
                                entry.spellId,
                                state,
                            );
                        if (!spell) {
                            return;
                        }
                        const fields =
                            spellFieldsById
                                .get(
                                    spell.id,
                                );
                        const rank =
                            getSpellProficiency(
                                entry
                                    .proficiencyXp,
                            );
                        const card =
                            document.createElement(
                                'article',
                            );
                        const heading =
                            document.createElement(
                                'header',
                            );
                        const title =
                            document.createElement(
                                'strong',
                            );
                        const use =
                            document.createElement(
                                'button',
                            );
                        const detail =
                            document.createElement(
                                'p',
                            );
                        const meta =
                            document.createElement(
                                'small',
                            );
                        title.textContent =
                            spell.incantation ||
                            spell.nameEn;
                        use.type =
                            'button';
                        use.textContent =
                            staticText(
                                'ui.inspector.spells.insert',
                                'Insert',
                            );
                        use.addEventListener(
                            'click',
                            () =>
                                setComposerSpell(
                                    spell.id,
                                ),
                        );
                        detail.textContent =
                            `${getLocalizedField(
                                fields[0],
                            ).text} · ${getLocalizedField(
                                fields[1],
                            ).text}`;
                        meta.textContent = [
                            getLocalizedField({
                                staticKey:
                                    `spell.rank.${rank.id}`,
                                sourceTextEn:
                                    rank.id,
                            }).text,
                            `${
                                entry
                                    .proficiencyXp
                            } XP`,
                            getLocalizedField({
                                staticKey:
                                    `spell.source.${entry.learnedSource}`,
                                sourceTextEn:
                                    entry
                                        .learnedSource,
                            }).text,
                            formatStaticText(
                                'ui.inspector.spells.attempts',
                                '{count} attempts',
                                {
                                    count:
                                        entry
                                            .attempts,
                                },
                            ),
                        ].join(' · ');
                        heading.append(
                            title,
                            use,
                        );
                        card.append(
                            heading,
                            detail,
                            meta,
                        );
                        ledger.append(card);
                    });
            }
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.spells.learned',
                        'Learned spells',
                    ),
                    ledger,
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.spells.rules',
                        'Learning rules',
                    ),
                    createList([
                        {
                            label:
                                staticText(
                                    'ui.inspector.spells.curriculum_reference',
                                    'Curriculum year is only a reference',
                                ),
                            detail:
                                staticText(
                                    'ui.inspector.spells.curriculum_detail',
                                    'It never blocks self-study, private instruction, or experimentation.',
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.spells.roll_required',
                                    'Every structured cast rolls a check',
                                ),
                            detail:
                                staticText(
                                    'ui.inspector.spells.roll_detail',
                                    'Success, failure, and critical success all change proficiency.',
                                ),
                        },
                    ]),
                ),
            );
            return;
        }
        if (tab === 'items') {
            const referenceItem =
                item => {
                    const directive =
                        createItemReferenceDirective(
                            item,
                        );
                    if (!directive) {
                        return;
                    }
                    insertAtCursor(
                        directive,
                    );
                    root.classList.remove(
                        'hpmud-inspector-open',
                    );
                    root.querySelector(
                        '#hpmud_character',
                    )?.setAttribute(
                        'aria-expanded',
                        'false',
                    );
                    toastr.success(
                        formatStaticText(
                            'ui.inspector.items.referenced',
                            'Referenced {label}',
                            {
                                label:
                                    item.label,
                            },
                        ),
                    );
                };
            const projection =
                projectItemLedger(
                    state,
                    session
                        .displayLocale,
                    {
                        getLocalizedField,
                        getRoomName,
                    },
                );
            const itemSourceById =
                new Map(
                    (state.items || [])
                        .map(item => [
                            item.id,
                            item,
                        ]),
                );
            const itemFields =
                projection.cards
                    .flatMap(card =>
                        getVisibleItemLocalizationFields(
                            itemSourceById
                                .get(
                                    card.id,
                                ),
                        ));
            void Promise.resolve(
                ensureLocalizedFields(
                    itemFields,
                    {
                        priority: 1,
                    },
                ),
            ).catch(error =>
                console.warn(
                    '[Hogwarts MUD] Item ledger localization query failed',
                    error,
                ));
            const localizedCards =
                new Map(
                    projection.cards
                        .map(card => [
                            card.id,
                            localizeItemCard(
                                card,
                                itemSourceById
                                    .get(
                                        card.id,
                                    ),
                                getLocalizedField,
                            ),
                        ]),
                );
            const localizedProjection = {
                cards:
                    projection.cards
                        .map(card =>
                            localizedCards
                                .get(
                                    card.id,
                                )),
                active:
                    projection.active
                        .map(card =>
                            localizedCards
                                .get(
                                    card.id,
                                )),
                history:
                    projection.history
                        .map(card =>
                            localizedCards
                                .get(
                                    card.id,
                                )),
            };
            inspectorElement.append(
                createLocalizationStatus(
                    itemFields,
                    'hpmud-dossier-localization-status',
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    '',
                    createItemLedger(
                        localizedProjection,
                        {
                            onReferenceItem:
                                referenceItem,
                            displayLocale:
                                session
                                    .displayLocale,
                        },
                    ),
                ),
            );
            return;
        }

        const clues =
            localizeGenericEntries(
                'clue',
                state.clues
                    .filter(clue =>
                        clue.discovered ===
                            true),
            );
        const statuses =
            localizeGenericEntries(
                'status',
                state.status,
            );
        const genericFields = [
            ...clues.fields,
            ...statuses.fields,
        ];
        void Promise.resolve(
            ensureLocalizedFields(
                genericFields,
                {
                    priority: 1,
                },
            ),
        ).catch(() => {});
        inspectorElement.append(
            createLocalizationStatus(
                tab === 'status'
                    ? statuses.fields
                    : clues.fields,
                'hpmud-dossier-localization-status',
            ),
        );
        const map = {
            clues: [
                staticText(
                    'ui.inspector.tab.clues',
                    'Clues',
                ),
                clues.entries,
            ],
            status: [
                staticText(
                    'ui.inspector.tab.status',
                    'Status',
                ),
                statuses.entries,
            ],
        };
        const [title, entries] = map[tab] ?? map.clues;
        inspectorElement.append(createInspectorCard(title, createList(entries)));
        if (tab === 'status') {
            const knowledge = state.knowledgeBase || {};
            const counts = knowledge.categories || {};
            inspectorElement.append(
                createInspectorCard(
                    staticText(
                        'ui.inspector.knowledge.title',
                        'Local world archive',
                    ),
                    createList([
                        {
                            label:
                                knowledge.vectorStatus ===
                                    'ready'
                                    ? staticText(
                                        'ui.inspector.knowledge.ready',
                                        'RAG index ready',
                                    )
                                    : staticText(
                                        'ui.inspector.knowledge.pending',
                                        'RAG index awaiting sync',
                                    ),
                            detail:
                                formatStaticText(
                                    'ui.inspector.knowledge.counts',
                                    'Characters {actors} · Scenes {scenes} · Events {events} · Clues {clues}',
                                    {
                                        actors:
                                            counts.actors ||
                                            0,
                                        scenes:
                                            counts.scenes ||
                                            0,
                                        events:
                                            counts.events ||
                                            0,
                                        clues:
                                            counts.clues ||
                                            0,
                                    },
                                ),
                        },
                        {
                            label:
                                staticText(
                                    'ui.inspector.knowledge.local_directory',
                                    'Local directory',
                                ),
                            detail:
                                knowledge.rootPath ||
                                staticText(
                                    'ui.inspector.knowledge.created_after_sync',
                                    'Created after the first sync',
                                ),
                        },
                    ]),
                ),
            );
        }
    }

    return {
        createInspectorCard,
        createList,
        renderInspector,
    };
}

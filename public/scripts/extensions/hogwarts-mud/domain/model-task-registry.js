export const MODEL_TASK_REGISTRY_VERSION = 1;

export const MODEL_TASK_EVENT_TYPES =
    Object.freeze([
        'setup.character_polish_requested',
        'world.bootstrap_requested',
        'world.foundation_repair_requested',
        'world.bootstrap_committed',
        'turn.pre_generation',
        'turn.generation',
        'turn.post_commit',
        'scene.close_requested',
        'scene.transition_committed',
        'memory.event_boundary_committed',
        'calendar.high_planning_requested',
        'calendar.horizon_low',
        'calendar.player_commitment',
        'map.container_entered',
        'map.expansion_requested',
        'localization.idle_batch_requested',
    ]);

const eventTypes =
    new Set(
        MODEL_TASK_EVENT_TYPES,
    );

function task(
    taskId,
    {
        family,
        kind,
        tiers,
        triggerEvents,
        phase,
        blocking,
        quotaGroup,
        budgetPolicyId,
        owner,
        ledgerScope = 'world',
        status = 'active',
        replacementTaskIds = [],
    },
) {
    return Object.freeze({
        taskId,
        family,
        kind,
        allowedTiers:
            Object.freeze([
                ...tiers,
            ]),
        triggerEvents:
            Object.freeze([
                ...triggerEvents,
            ]),
        phase,
        blocking:
            blocking === true,
        quotaGroup,
        budgetPolicyId,
        owner,
        ledgerScope,
        status,
        replacementTaskIds:
            Object.freeze([
                ...replacementTaskIds,
            ]),
    });
}

export const MODEL_TASK_CATALOG =
    Object.freeze([
        task(
            'character_polish',
            {
                family: 'setup',
                kind: 'utility',
                tiers: ['medium'],
                triggerEvents: [
                    'setup.character_polish_requested',
                ],
                phase: 'explicit_user_action',
                blocking: true,
                quotaGroup:
                    'explicit_utility',
                budgetPolicyId:
                    'medium_character_polish',
                owner:
                    'ui/setup-controller.js',
            },
        ),
        task(
            'opening_world',
            {
                family: 'world',
                kind: 'director',
                tiers: ['high'],
                triggerEvents: [
                    'world.bootstrap_requested',
                ],
                phase: 'bootstrap',
                blocking: true,
                quotaGroup:
                    'bootstrap_high',
                budgetPolicyId:
                    'high_opening_world',
                owner:
                    'workflows/opening.js',
            },
        ),
        task(
            'director_foundation',
            {
                family: 'world',
                kind: 'director',
                tiers: ['high'],
                triggerEvents: [
                    'world.foundation_repair_requested',
                ],
                phase: 'bootstrap_repair',
                blocking: true,
                quotaGroup:
                    'bootstrap_high',
                budgetPolicyId:
                    'high_foundation',
                owner:
                    'workflows/opening.js',
                status: 'retired',
                replacementTaskIds: [
                    'opening_world',
                ],
            },
        ),
        task(
            'opening_scene_plan',
            {
                family: 'scene',
                kind: 'director',
                tiers: ['medium'],
                triggerEvents: [
                    'world.bootstrap_committed',
                ],
                phase: 'bootstrap',
                blocking: true,
                quotaGroup:
                    'medium_scene',
                budgetPolicyId:
                    'medium_opening_scene',
                owner:
                    'workflows/opening.js',
                status: 'retired',
                replacementTaskIds: [
                    'scene_opening',
                ],
            },
        ),
        task(
            'opening_dialogue',
            {
                family: 'performance',
                kind: 'performer',
                tiers: ['low'],
                triggerEvents: [
                    'world.bootstrap_committed',
                ],
                phase: 'bootstrap',
                blocking: true,
                quotaGroup:
                    'low_performance',
                budgetPolicyId:
                    'low_opening_dialogue',
                owner:
                    'workflows/opening.js',
                status: 'retired',
                replacementTaskIds: [
                    'scene_opening',
                ],
            },
        ),
        task(
            'calendar_high',
            {
                family: 'calendar',
                kind: 'director',
                tiers: ['high'],
                triggerEvents: [
                    'calendar.high_planning_requested',
                ],
                phase: 'post_commit',
                blocking: false,
                quotaGroup:
                    'high_planning',
                budgetPolicyId:
                    'high_calendar',
                owner:
                    'workflows/high-calendar-director.js',
            },
        ),
        task(
            'calendar_medium',
            {
                family: 'calendar',
                kind: 'director',
                tiers: ['medium'],
                triggerEvents: [
                    'calendar.horizon_low',
                    'calendar.player_commitment',
                    'calendar.high_planning_requested',
                ],
                phase: 'post_commit',
                blocking: false,
                quotaGroup:
                    'medium_maintenance',
                budgetPolicyId:
                    'medium_calendar',
                owner:
                    'workflows/medium-calendar-director.js',
            },
        ),
        task(
            'interior_cartographer',
            {
                family: 'map',
                kind: 'director',
                tiers: ['medium'],
                triggerEvents: [
                    'map.container_entered',
                ],
                phase: 'post_commit',
                blocking: true,
                quotaGroup:
                    'medium_maintenance',
                budgetPolicyId:
                    'medium_interior_map',
                owner:
                    'workflows/interior-map.js',
            },
        ),
        task(
            'daily_director',
            {
                family: 'scene',
                kind: 'director',
                tiers: ['medium'],
                triggerEvents: [
                    'turn.pre_generation',
                    'scene.transition_committed',
                ],
                phase: 'pre_generation',
                blocking: true,
                quotaGroup:
                    'medium_scene',
                budgetPolicyId:
                    'medium_daily',
                owner:
                    'workflows/directors.js',
                status: 'retired',
                replacementTaskIds: [
                    'scene_transition',
                    'social_director',
                ],
            },
        ),
        task(
            'pacing_director',
            {
                family: 'scene',
                kind: 'director',
                tiers: ['medium'],
                triggerEvents: [
                    'turn.pre_generation',
                ],
                phase: 'pre_generation',
                blocking: true,
                quotaGroup:
                    'medium_scene',
                budgetPolicyId:
                    'medium_pacing',
                owner:
                    'workflows/directors.js',
            },
        ),
        task(
            'scene_performance',
            {
                family: 'performance',
                kind: 'performer',
                tiers: ['low'],
                triggerEvents: [
                    'turn.generation',
                ],
                phase: 'generation',
                blocking: true,
                quotaGroup:
                    'low_performance',
                budgetPolicyId:
                    'low_scene_performance',
                owner:
                    'workflows/turn-performance.js',
            },
        ),
        task(
            'scene_transition',
            {
                family: 'scene',
                kind: 'director',
                tiers: [
                    'medium',
                    'high',
                ],
                triggerEvents: [
                    'scene.close_requested',
                ],
                phase: 'scene_close',
                blocking: true,
                quotaGroup:
                    'medium_scene',
                budgetPolicyId:
                    'scene_transition',
                owner:
                    'workflows/scene-transition.js',
            },
        ),
        task(
            'scene_opening',
            {
                family: 'performance',
                kind: 'performer',
                tiers: ['low'],
                triggerEvents: [
                    'world.bootstrap_committed',
                    'scene.transition_committed',
                ],
                phase: 'scene_opening',
                blocking: true,
                quotaGroup:
                    'low_performance',
                budgetPolicyId:
                    'low_scene_opening',
                owner:
                    'workflows/scene-transition.js',
            },
        ),
        task(
            'social_director',
            {
                family: 'social',
                kind: 'director',
                tiers: ['medium'],
                triggerEvents: [
                    'turn.post_commit',
                    'memory.event_boundary_committed',
                ],
                phase: 'post_commit',
                blocking: false,
                quotaGroup:
                    'medium_scene',
                budgetPolicyId:
                    'medium_social',
                owner:
                    'workflows/social-memory.js',
            },
        ),
        task(
            'map_expansion',
            {
                family: 'map',
                kind: 'director',
                tiers: ['high'],
                triggerEvents: [
                    'map.expansion_requested',
                ],
                phase: 'explicit_user_action',
                blocking: true,
                quotaGroup:
                    'explicit_utility',
                budgetPolicyId:
                    'high_map_expansion',
                owner:
                    'ui/map-renderer.js',
            },
        ),
        task(
            'local_pre_turn_adjudicator',
            {
                family: 'local_semantic',
                kind: 'local_observer',
                tiers: ['local'],
                triggerEvents: [
                    'turn.pre_generation',
                ],
                phase: 'pre_generation',
                blocking: true,
                quotaGroup:
                    'local_turn',
                budgetPolicyId:
                    'local_pre_turn',
                owner:
                    'adapters/local-semantic.js',
            },
        ),
        task(
            'local_post_turn_observer',
            {
                family: 'local_semantic',
                kind: 'local_observer',
                tiers: ['local'],
                triggerEvents: [
                    'turn.post_commit',
                ],
                phase: 'post_generation',
                blocking: true,
                quotaGroup:
                    'local_turn',
                budgetPolicyId:
                    'local_post_turn',
                owner:
                    'adapters/local-semantic.js',
            },
        ),
        task(
            'local_inventory_observer',
            {
                family: 'local_semantic',
                kind: 'local_observer',
                tiers: ['local'],
                triggerEvents: [
                    'turn.post_commit',
                ],
                phase: 'post_generation',
                blocking: false,
                quotaGroup:
                    'local_turn',
                budgetPolicyId:
                    'local_inventory',
                owner:
                    'adapters/local-semantic.js',
            },
        ),
        task(
            'local_appraisal_proposer',
            {
                family: 'local_semantic',
                kind: 'local_observer',
                tiers: ['local'],
                triggerEvents: [
                    'memory.event_boundary_committed',
                ],
                phase: 'post_commit',
                blocking: false,
                quotaGroup:
                    'local_memory',
                budgetPolicyId:
                    'local_appraisal',
                owner:
                    'adapters/local-semantic.js',
            },
        ),
        task(
            'local_translation',
            {
                family: 'translation',
                kind: 'utility',
                tiers: ['local'],
                triggerEvents: [
                    'localization.idle_batch_requested',
                ],
                phase: 'idle_display',
                blocking: false,
                quotaGroup:
                    'local_translation',
                budgetPolicyId:
                    'local_translation',
                owner:
                    'adapters/translation.js',
                ledgerScope:
                    'ephemeral_display',
            },
        ),
    ]);

const taskById =
    new Map(
        MODEL_TASK_CATALOG.map(value => [
            value.taskId,
            value,
        ]),
    );

export function getModelTaskDefinition(
    taskId,
) {
    return taskById.get(
        String(taskId || ''),
    ) || null;
}

export function validateModelTaskCatalog() {
    const errors = [];
    if (
        taskById.size !==
        MODEL_TASK_CATALOG.length
    ) {
        errors.push(
            'Model task IDs must be unique.',
        );
    }
    if (
        MODEL_TASK_CATALOG.length !== 20
    ) {
        errors.push(
            'Model task catalog must account for exactly 20 current tasks.',
        );
    }
    for (const definition of
        MODEL_TASK_CATALOG) {
        if (
            ![
                'director',
                'performer',
                'local_observer',
                'utility',
            ].includes(
                definition.kind,
            )
        ) {
            errors.push(
                `${definition.taskId} has an invalid kind.`,
            );
        }
        if (
            ![
                'active',
                'retiring',
                'retired',
            ].includes(
                definition.status,
            )
        ) {
            errors.push(
                `${definition.taskId} has an invalid status.`,
            );
        }
        for (const eventType of
            definition.triggerEvents) {
            if (
                !eventTypes.has(
                    eventType,
                )
            ) {
                errors.push(
                    `${definition.taskId} has unknown event ${eventType}.`,
                );
            }
        }
        for (const replacementId of
            definition
                .replacementTaskIds) {
            if (
                !taskById.has(
                    replacementId,
                )
            ) {
                errors.push(
                    `${definition.taskId} has unknown replacement ${replacementId}.`,
                );
            }
        }
    }
    return {
        valid:
            errors.length === 0,
        errors,
    };
}

const validation =
    validateModelTaskCatalog();
if (!validation.valid) {
    throw new TypeError(
        validation.errors.join(' '),
    );
}

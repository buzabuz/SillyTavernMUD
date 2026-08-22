#!/usr/bin/env node

import {
    createHash,
} from 'node:crypto';
import {
    mkdir,
    readFile,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import * as domain from '../../../public/scripts/extensions/hogwarts-mud/helpers.js';
import {
    selectPostItemContext,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/inventory-observation-context.js';
import {
    assemblePostTurnSemanticPrompt,
} from '../../../public/scripts/extensions/hogwarts-mud/domain/post-turn-prompt-assembly.js';
import {
    createLocalSemanticAdapter,
} from '../../../public/scripts/extensions/hogwarts-mud/adapters/local-semantic.js';

const archivePath = path.resolve(
    process.env
        .HOGWARTS_PROMPT_MEASURE_ARCHIVE_PATH ||
    (
        'data/default-user/chats/Hogwarts_World_Director/' +
        'Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl'
    ),
);
const outputPath = path.resolve(
    process.env
        .HOGWARTS_POST_MEASURE_OUTPUT ||
    '.trae/specs/hogwarts-low-post-chain-replacement/' +
        'measurement/active-save-post-provider-measurement.json',
);

function sha256(
    value,
) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function latestPlayerAction(
    chat,
) {
    return String(
        [...chat]
            .reverse()
            .find(message =>
                message.is_user ===
                true)
            ?.mes ||
        '',
    );
}

function latestNarrativeSegments(
    chat,
) {
    const message =
        [...chat]
            .reverse()
            .find(candidate =>
                !candidate.is_user &&
                Array.isArray(
                    candidate.extra
                        ?.hogwartsMud
                        ?.segments,
                ) &&
                candidate.extra
                    .hogwartsMud
                    .segments
                    .length);
    return (
        message
            ?.extra
            ?.hogwartsMud
            ?.segments ||
        []
    ).map(segment => ({
        type:
            segment.type,
        actorId:
            segment.actorId ||
            '',
        textEn:
            segment.textEn ||
            '',
    }));
}

function summarizeMeasurement(
    measurement,
) {
    return {
        characters:
            measurement.characters,
        messageCharacters:
            measurement.messageCharacters,
        transportSchemaCharacters:
            measurement.transportSchemaCharacters,
        runtimeWrapperCharacters:
            measurement.runtimeWrapperCharacters,
        estimatedTokens:
            measurement.estimatedTokens,
        sections:
            measurement.sections.map(section => ({
                role:
                    section.role,
                characters:
                    section.characters,
            })),
    };
}

function summarizeAssembly(
    assembly,
) {
    return {
        fit:
            assembly.fit,
        capacity:
            assembly.diagnostics
                .capacity,
        fullMeasurement:
            summarizeMeasurement(
                assembly.diagnostics
                    .fullMeasurement,
            ),
        finalMeasurement:
            summarizeMeasurement(
                assembly.diagnostics
                    .finalMeasurement,
            ),
        compactedSections:
            assembly.diagnostics
                .compactedSections,
    };
}

const source =
    await readFile(
        archivePath,
        'utf8',
    );
const rows = source
    .trimEnd()
    .split(/\r?\n/u)
    .map(line =>
        JSON.parse(line));
const state =
    structuredClone(
        rows[0]
            ?.chat_metadata
            ?.hogwartsMud ||
        {},
    );
const chat =
    rows.slice(1);
const playerAction =
    latestPlayerAction(chat);
const narrativeSegments =
    latestNarrativeSegments(chat);

if (!playerAction || !narrativeSegments.length) {
    throw new Error(
        'Active archive does not contain a player action and paid narration pair.',
    );
}

const localAdapter =
    createLocalSemanticAdapter({
        buildLocalMapModel:
            domain.buildLocalMapModel,
        buildStructuredPlayerTurnSequence:
            domain.buildStructuredPlayerTurnSequence,
        getRequestHeaders:
            () => ({}),
        projectObservedInventoryUpdates:
            domain.projectObservedInventoryUpdates,
        validatePerceptionContract:
            domain.validatePerceptionContract,
    });
const actors =
    localAdapter
        .buildLocalSemanticActorContext(
            state,
        )
        .map(actor => ({
            id:
                actor.id,
            nameEn:
                actor.nameEn,
            roleEn:
                actor.roleEn,
            mapId:
                actor.mapId,
            roomId:
                actor.roomId,
        }));
const playerTurnSequence =
    domain.buildStructuredPlayerTurnSequence(
        playerAction,
        {
            mode: 'open',
            actorIds: [],
            blocks: [],
            valid: true,
        },
    );
const commonInput = {
    clock:
        state.clock,
    elapsedMinutes: 15,
    playerAction,
    playerTurnSequence,
    targetActorIds: [],
    narrativeSegments,
    room:
        localAdapter
            .buildLocalSemanticRoomContext(
                state,
            ),
    actors,
    localPresence:
        state.localPresence ||
        null,
    existingActorPresence:
        null,
    movementPreflight: null,
};
const selectedItems =
    selectPostItemContext({
        state,
        playerAction,
        narrativeSegments,
    });
const slots =
    domain.normalizeModelSlots(
        state.modelSlots,
    );
const lowAssembly =
    assemblePostTurnSemanticPrompt({
        provider: 'low',
        input: {
            ...commonInput,
            itemCandidates:
                selectedItems.items,
            identityTargetActorIds: [],
            inspectionTargetActorIds: [],
        },
        lowSlot:
            slots.low,
    });
const localAssembly =
    assemblePostTurnSemanticPrompt({
        provider: 'local',
        input:
            commonInput,
    });
const after =
    await readFile(
        archivePath,
        'utf8',
    );

if (after !== source) {
    throw new Error(
        'Build-only Post measurement modified the active archive.',
    );
}

const report = {
    schemaVersion: 1,
    generatedAt:
        new Date().toISOString(),
    archive: {
        path:
            archivePath,
        sha256:
            sha256(source),
        bytes:
            Buffer.byteLength(
                source,
            ),
        unchanged: true,
    },
    modelCalls: 0,
    input: {
        playerActionCharacters:
            playerAction.length,
        narrativeSegmentCount:
            narrativeSegments.length,
        narrativeCharacters:
            narrativeSegments.reduce(
                (total, segment) =>
                    total +
                    String(
                        segment.textEn ||
                        '',
                    ).length,
                0,
            ),
        itemCandidates:
            selectedItems.diagnostics,
        actorCount:
            actors.length,
    },
    providers: {
        low:
            summarizeAssembly(
                lowAssembly,
            ),
        local:
            summarizeAssembly(
                localAssembly,
            ),
    },
};

await mkdir(
    path.dirname(
        outputPath,
    ),
    {
        recursive: true,
    },
);
await writeFile(
    outputPath,
    `${JSON.stringify(
        report,
        null,
        2,
    )}\n`,
    'utf8',
);
process.stdout.write(
    `${JSON.stringify(
        report,
        null,
        2,
    )}\n`,
);

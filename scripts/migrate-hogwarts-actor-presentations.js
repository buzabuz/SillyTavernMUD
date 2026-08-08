#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import {
    buildActorAppearanceView,
    migrateActorPresentationState,
} from '../public/scripts/extensions/hogwarts-mud/helpers.js';

const DEFAULT_DATA_ROOT =
    path.resolve(
        'data',
        'default-user',
    );

function listFiles(
    root,
    predicate,
) {
    if (!fs.existsSync(root)) {
        return [];
    }
    const files = [];
    for (
        const entry
        of fs.readdirSync(
            root,
            {
                withFileTypes: true,
            },
        )
    ) {
        const target =
            path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(
                ...listFiles(
                    target,
                    predicate,
                ),
            );
        } else if (
            predicate(target)
        ) {
            files.push(target);
        }
    }
    return files;
}

function writeWithBackup(
    file,
    content,
) {
    const backup =
        `${file}.pre-actor-presentation-v1`;
    if (!fs.existsSync(backup)) {
        fs.copyFileSync(
            file,
            backup,
        );
    }
    const temporary =
        `${file}.tmp-${process.pid}`;
    fs.writeFileSync(
        temporary,
        content,
        'utf8',
    );
    fs.renameSync(
        temporary,
        file,
    );
}

function migrateChatFile(file) {
    const source =
        fs.readFileSync(
            file,
            'utf8',
        );
    const newline =
        source.indexOf('\n');
    const headerText =
        newline >= 0
            ? source.slice(0, newline)
            : source;
    let header;
    try {
        header =
            JSON.parse(headerText);
    } catch {
        return false;
    }
    const state =
        header.chat_metadata
            ?.hogwartsMud;
    if (!state) return false;
    const migration =
        migrateActorPresentationState(
            state,
        );
    if (!migration.changed) {
        return false;
    }
    header.chat_metadata.hogwartsMud =
        migration.state;
    const actorHashes =
        migration.state
            .knowledgeBase
            ?.recordHashes;
    if (actorHashes) {
        for (
            const key
            of Object.keys(actorHashes)
        ) {
            if (
                key.startsWith(
                    'actors:',
                )
            ) {
                delete actorHashes[key];
            }
        }
    }
    const remainder =
        newline >= 0
            ? source.slice(newline)
            : '';
    writeWithBackup(
        file,
        JSON.stringify(header) +
            remainder,
    );
    return true;
}

function formatPresentation(
    presentation,
) {
    return [
        presentation.outfit
            ? `outfit: ${presentation.outfit}`
            : '',
        presentation.accessories
            .length
            ? `accessories: ${presentation.accessories.join(', ')}`
            : '',
        presentation.hair
            ? `hair: ${presentation.hair}`
            : '',
        presentation.visibleConditions
            .length
            ? `visible conditions: ${presentation.visibleConditions.join(', ')}`
            : '',
        presentation.heldItems
            .length
            ? `held items: ${presentation.heldItems
                .map(entry =>
                    `${entry.hand}: ${entry.item}`)
                .join(', ')}`
            : '',
    ].filter(Boolean).join(' | ');
}

function migrateActorRecord(file) {
    let record;
    try {
        record = JSON.parse(
            fs.readFileSync(
                file,
                'utf8',
            ),
        );
    } catch {
        return false;
    }
    const profile =
        record.data?.profile;
    if (!profile?.id) {
        return false;
    }
    const current =
        record.data.currentState ||
        null;
    const state = {
        clock:
            current?.updatedClock ||
            '',
        actors:
            current
                ? [current]
                : [],
        actorLibrary: [profile],
        actorPresentations: {},
        map: {
            activeMapId:
                current?.mapId ||
                '',
            currentLocalNodeId:
                current?.roomId ||
                '',
            roomStates: {},
        },
        scene: {
            id:
                record.entityIds
                    ?.at(-1) ||
                '',
        },
    };
    const migration =
        migrateActorPresentationState(
            state,
        );
    const migratedProfile =
        migration.state
            .actorLibrary[0];
    const migratedCurrent =
        migration.state
            .actors[0] ||
        current;
    const appearance =
        buildActorAppearanceView(
            migration.state,
            profile.id,
        );
    const presentationText =
        formatPresentation(
            appearance.presentation,
        );
    const lines =
        String(record.text || '')
            .split('\n')
            .filter(line =>
                !line.startsWith(
                    'Public description:',
                ) &&
                !line.startsWith(
                    'Physical description:',
                ) &&
                !line.startsWith(
                    'Current presentation:',
                ));
    const backgroundIndex =
        lines.findIndex(line =>
            line.startsWith(
                'Public background:',
            ));
    const appearanceLines = [
        `Physical description: ${appearance.physicalDescriptionEn || appearance.physicalDescription}`,
        `Current presentation: ${presentationText}`,
    ];
    lines.splice(
        backgroundIndex >= 0
            ? backgroundIndex
            : lines.length,
        0,
        ...appearanceLines,
    );
    record.text =
        lines.join('\n');
    record.data.profile =
        migratedProfile;
    record.data.currentState =
        migratedCurrent;
    record.data.currentPresentation =
        appearance.presentation;
    record.updatedAt =
        new Date().toISOString();
    writeWithBackup(
        file,
        `${JSON.stringify(
            record,
            null,
            2,
        )}\n`,
    );
    return true;
}

const dataRoot =
    path.resolve(
        process.argv[2] ||
        DEFAULT_DATA_ROOT,
    );
const chatFiles =
    listFiles(
        path.join(
            dataRoot,
            'chats',
        ),
        file =>
            file.endsWith('.jsonl'),
    );
const actorFiles =
    listFiles(
        path.join(
            dataRoot,
            'user',
            'files',
            'hogwarts-mud',
        ),
        file =>
            file.includes(
                `${path.sep}actors${path.sep}`,
            ) &&
            file.endsWith('.json'),
    );
const migratedChats =
    chatFiles.filter(
        migrateChatFile,
    );
const migratedActors =
    actorFiles.filter(
        migrateActorRecord,
    );

console.log(JSON.stringify({
    dataRoot,
    migratedChats,
    migratedActorRecords:
        migratedActors,
}, null, 2));

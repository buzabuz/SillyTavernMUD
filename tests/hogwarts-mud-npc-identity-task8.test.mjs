/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    createHash,
} from 'node:crypto';
import {
    mkdtemp,
    readFile,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    buildNpcIdentityPromptProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    buildNpcIdentityDossierViewModel,
} from '../public/scripts/extensions/hogwarts-mud/ui/npc-identity-dossier.js';

const HARRY_ID =
    'canon_harry_james_potter';

async function fileStatus(file) {
    const contents =
        await readFile(file);
    const stats =
        await stat(
            file,
            {
                bigint: true,
            },
        );
    return {
        sha256:
            createHash('sha256')
                .update(contents)
                .digest('hex'),
        mtimeNs: stats.mtimeNs,
    };
}

function createLegacyTinaJsonl() {
    const header = {
        user_name: 'Tina',
        character_name:
            'Hogwarts World Director',
        chat_metadata: {
            hogwartsMud: {
                clock:
                    '1991-09-02 · 13:35',
                actorLibrary: [{
                    id: HARRY_ID,
                    canonCatalogId:
                        HARRY_ID,
                    name:
                        '哈利·波特',
                    nameEn:
                        'Harry Potter',
                    role: '学生',
                    roleEn:
                        'Student',
                }],
                actors: [],
            },
        },
    };
    const message = {
        name: 'Tina',
        is_user: true,
        mes:
            'Deterministic legacy-load fixture message.',
    };
    return [
        JSON.stringify(header),
        JSON.stringify(message),
        '',
    ].join('\n');
}

async function createLegacyTinaFixture(
    t,
) {
    const root =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                'hpmud-tina-legacy-',
            ),
        );
    t.after(() =>
        rm(
            root,
            {
                recursive: true,
                force: true,
            },
        ));
    const file =
        path.join(
            root,
            'Tina.jsonl',
        );
    await writeFile(
        file,
        createLegacyTinaJsonl(),
        {
            mode: 0o600,
        },
    );
    return file;
}

async function readLegacyTinaState(
    file,
) {
    const firstLine =
        (
            await readFile(
                file,
                'utf8',
            )
        ).split('\n', 1)[0];
    return JSON.parse(
        firstLine,
    ).chat_metadata.hogwartsMud;
}

test(
    'Tina legacy fixture load projects Harry Canon authority without writing the JSONL',
    async t => {
        const legacyChatPath =
            await createLegacyTinaFixture(
                t,
            );
        const before =
            await fileStatus(
                legacyChatPath,
            );
        const state =
            await readLegacyTinaState(
                legacyChatPath,
            );
        const profile =
            state.actorLibrary
                .find(actor =>
                    actor.id ===
                    HARRY_ID);

        assert.equal(
            profile.canonCatalogId,
            HARRY_ID,
        );
        assert.equal(
            profile.identity,
            undefined,
            'the acceptance fixture must exercise the pre-Identity load path',
        );

        const projection =
            buildNpcIdentityPromptProjection(
                state,
                HARRY_ID,
                'authority',
            );
        const dossier =
            buildNpcIdentityDossierViewModel({
                worldState: state,
                actorId: HARRY_ID,
                buildIdentityProjection:
                    buildNpcIdentityPromptProjection,
            });
        const groups =
            new Map(
                dossier.groups.map(
                    group => [
                        group.id,
                        group,
                    ],
                ),
            );

        assert.equal(
            projection.authority
                ?.gender.code,
            'male',
        );
        assert.equal(
            projection.authority
                ?.birth.date,
            '1980-07-31',
        );
        assert.equal(
            projection.authority
                ?.education[0]
                ?.houseId,
            'gryffindor',
        );
        assert.equal(
            projection.authority
                ?.body.hairStyle,
            'untidy',
        );
        assert.deepEqual(
            groups.get('basic')
                .entries.map(entry =>
                    entry.value),
            [
                '男',
                '1980-07-31',
                '11 岁',
            ],
        );
        assert.equal(
            groups.get('lineage')
                .entries[0].value,
            '混血',
        );
        assert.equal(
            profile.identity,
            undefined,
            'load projection must not mutate the legacy state',
        );
        assert.deepEqual(
            await fileStatus(
                legacyChatPath,
            ),
            before,
            'load projection must remain read-only',
        );
    },
);

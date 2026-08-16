import {
    readFile,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
    fileURLToPath,
} from 'node:url';

const DIRECTORY =
    path.dirname(
        fileURLToPath(
            import.meta.url,
        ),
    );
const MANIFEST_PATH =
    path.join(
        DIRECTORY,
        'regex-classification.json',
    );
const REVIEW_PATH =
    path.join(
        DIRECTORY,
        'regex-review-corrections.json',
    );
const BASELINE_PATH =
    path.join(
        DIRECTORY,
        'regex-semantic-baseline.json',
    );

try {
    await readFile(
        BASELINE_PATH,
        'utf8',
    );
    throw new Error(
        'The semantic baseline already exists. Reviewed corrections cannot be applied after the baseline is frozen.',
    );
} catch (error) {
    if (
        error?.code !==
            'ENOENT'
    ) {
        throw error;
    }
}

const manifest =
    JSON.parse(
        await readFile(
            MANIFEST_PATH,
            'utf8',
        ),
    );
const review =
    JSON.parse(
        await readFile(
            REVIEW_PATH,
            'utf8',
        ),
    );
const corrections =
    new Map();

for (const group of review.groups || []) {
    for (const id of group.ids || []) {
        if (corrections.has(id)) {
            throw new Error(
                `Reviewed correction ${id} is duplicated.`,
            );
        }
        corrections.set(
            id,
            group,
        );
    }
}

const manifestById =
    new Map(
        manifest.rows.map(row => [
            row.id,
            row,
        ]),
    );
for (const id of corrections.keys()) {
    if (!manifestById.has(id)) {
        throw new Error(
            `Reviewed correction ${id} is absent from the manifest.`,
        );
    }
}

manifest.rows =
    manifest.rows.map(row => {
        const correction =
            corrections.get(
                row.id,
            );
        if (!correction) {
            return row;
        }
        const desired = {
            category:
                correction.category,
            rationale:
                correction.rationale,
            targetOwner:
                correction.targetOwner,
            deterministicOwner:
                correction
                    .deterministicOwner,
            phase2Action:
                correction
                    .phase2Action,
        };
        if (
            Object.entries(
                desired,
            ).every(([
                field,
                value,
            ]) =>
                row[field] ===
                    value)
        ) {
            return row;
        }
        if (
            !(
                correction
                    .fromCategories ||
                []
            ).includes(
                row.category,
            )
        ) {
            throw new Error(
                `Reviewed correction ${row.id} expected ${correction.fromCategories.join('|')}, found ${row.category}.`,
            );
        }
        return {
            ...row,
            ...desired,
        };
    });

await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
        manifest,
        null,
        2,
    )}\n`,
    'utf8',
);

const counts =
    Object.fromEntries(
        [
            'accepted_lexical',
            'semantic_runtime',
            'semantic_migration',
            'dead_or_retired',
            'unclassified',
        ].map(category => [
            category,
            manifest.rows
                .filter(row =>
                    row.category ===
                    category)
                .length,
        ]),
    );

process.stdout.write(
    `${JSON.stringify({
        correctedRows:
            corrections.size,
        counts,
    }, null, 2)}\n`,
);

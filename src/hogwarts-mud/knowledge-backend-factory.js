import path from 'node:path';

import { getConfigValue } from '../util.js';
import {
    getTransformersBatchVector,
} from '../vectors/embedding.js';
import {
    createJsonKnowledgeBackend,
} from './knowledge-json-backend.js';
import {
    createQdrantKnowledgeBackend,
} from './knowledge-qdrant-backend.js';
import {
    createRelationalKnowledgeService,
} from './knowledge-relational-service.js';
import {
    createKnowledgeVectorService,
} from './knowledge-vector-service.js';

function configBoolean(name, fallback) {
    return Boolean(
        getConfigValue(
            name,
            fallback,
            'boolean',
        ),
    );
}

function configNumber(name, fallback) {
    return Number(
        getConfigValue(
            name,
            fallback,
            'number',
        ),
    ) || fallback;
}

export function getKnowledgeBackendConfig() {
    const url =
        String(
            process.env
                .HOGWARTS_QDRANT_URL ||
            getConfigValue(
                'hogwartsMud.knowledge.qdrant.url',
                '',
            ) ||
            '',
        ).trim();
    const enabled =
        configBoolean(
            'hogwartsMud.knowledge.qdrant.enabled',
            Boolean(url),
        ) &&
        Boolean(url);
    return {
        qdrant: {
            enabled,
            url,
            apiKey:
                String(
                    process.env
                        .HOGWARTS_QDRANT_API_KEY ||
                    getConfigValue(
                        'hogwartsMud.knowledge.qdrant.apiKey',
                        '',
                    ) ||
                    '',
                ),
            collectionPrefix:
                String(
                    getConfigValue(
                        'hogwartsMud.knowledge.qdrant.collectionPrefix',
                        'hogwarts_knowledge',
                    ),
                ),
            embeddingModel:
                String(
                    getConfigValue(
                        'hogwartsMud.knowledge.embeddingModel',
                        'transformers',
                    ),
                ),
            dimensions:
                configNumber(
                    'hogwartsMud.knowledge.embeddingDimensions',
                    384,
                ),
            timeoutMs:
                configNumber(
                    'hogwartsMud.knowledge.qdrant.timeoutMs',
                    10_000,
                ),
        },
    };
}

export function createConfiguredKnowledgeService({
    filesRoot,
    fetchImpl = globalThis.fetch,
    embedder =
    async texts =>
        getTransformersBatchVector(
            texts,
        ),
    config =
    getKnowledgeBackendConfig(),
}) {
    const exactBackend =
        createJsonKnowledgeBackend({
            root:
                path.join(
                    filesRoot,
                    'hogwarts-mud',
                ),
        });
    const preferredBackend =
        config.qdrant?.enabled
            ? createQdrantKnowledgeBackend({
                ...config.qdrant,
                fetchImpl,
                embedder,
            })
            : null;
    const vectorService =
        createKnowledgeVectorService({
            exactBackend,
            preferredBackend,
        });
    return createRelationalKnowledgeService({
        vectorService,
    });
}

import {
    disposePipeline,
    getPipeline,
} from '../transformers.js';
import { getConfigValue } from '../util.js';
const TASK = 'feature-extraction';
export const TRANSFORMERS_EMBEDDING_MAX_TOKENS = 512;
export const TRANSFORMERS_EMBEDDING_BATCH_SIZE = 10;
const DEFAULT_EMBEDDING_IDLE_MS = 300_000;

let embeddingIdleTimer = null;
let embeddingRunQueue = Promise.resolve();

function clearEmbeddingIdleTimer() {
    clearTimeout(
        embeddingIdleTimer,
    );
    embeddingIdleTimer = null;
}

function scheduleEmbeddingDispose() {
    clearEmbeddingIdleTimer();
    const idleMs = Math.max(
        60_000,
        Number(
            getConfigValue(
                'hogwartsMud.embeddingIdleMs',
                DEFAULT_EMBEDDING_IDLE_MS,
                'number',
            ),
        ) ||
        DEFAULT_EMBEDDING_IDLE_MS,
    );
    embeddingIdleTimer =
        setTimeout(
            () => {
                embeddingIdleTimer =
                    null;
                void disposePipeline(
                    TASK,
                ).catch(error => {
                    console.warn(
                        'Failed to dispose idle embedding pipeline.',
                        error,
                    );
                });
            },
            idleMs,
        );
    embeddingIdleTimer.unref?.();
}

function serializeEmbeddingRun(operation) {
    const run =
        embeddingRunQueue.then(
            operation,
            operation,
        );
    embeddingRunQueue =
        run.then(
            () => undefined,
            () => undefined,
        );
    return run;
}

function assertEmbeddingModel(model) {
    const declaredModel =
        String(model || '').trim();
    if (!declaredModel) {
        return;
    }
    const configuredModel =
        String(
            getConfigValue(
                'extensions.models.embedding',
                '',
            ) ||
            '',
        ).trim();
    if (
        declaredModel !==
        configuredModel
    ) {
        throw new Error(
            `Backend embedding model "${declaredModel}" does not match extensions.models.embedding "${configuredModel}".`,
        );
    }
}

function clampEmbeddingTokenizer(pipe) {
    if (
        pipe.tokenizer &&
        Number(
            pipe.tokenizer
                .model_max_length,
        ) >
            TRANSFORMERS_EMBEDDING_MAX_TOKENS
    ) {
        pipe.tokenizer
            .model_max_length =
            TRANSFORMERS_EMBEDDING_MAX_TOKENS;
    }
}

function splitEmbeddingTensor(
    tensor,
    expectedRows,
) {
    const dims =
        tensor?.dims;
    if (
        !Array.isArray(dims) ||
        dims.length !== 2 ||
        dims[0] !== expectedRows ||
        !Number.isSafeInteger(dims[1]) ||
        dims[1] <= 0
    ) {
        throw new Error(
            `Embedding tensor shape must contain ${expectedRows} rows and one positive dimension; received ${JSON.stringify(dims)}.`,
        );
    }
    const dimension =
        dims[1];
    if (
        !tensor?.data ||
        typeof tensor.data.length !==
            'number' ||
        tensor.data.length !==
            expectedRows * dimension
    ) {
        throw new Error(
            `Embedding tensor shape [${dims.join(', ')}] requires ${expectedRows * dimension} values; received ${tensor?.data?.length ?? 'none'}.`,
        );
    }
    const values =
        Array.from(
            tensor.data,
        );
    if (
        values.some(value =>
            !Number.isFinite(value))
    ) {
        throw new Error(
            'Embedding tensor contains a non-finite value.',
        );
    }
    return Array.from(
        { length: expectedRows },
        (_, row) =>
            values.slice(
                row * dimension,
                (row + 1) *
                    dimension,
            ),
    );
}

async function runEmbeddingBatch(
    pipe,
    texts,
) {
    const result = await pipe(
        texts,
        {
            pooling: 'mean',
            normalize: true,
        },
    );
    return splitEmbeddingTensor(
        result,
        texts.length,
    );
}

/**
 * Gets the vectorized text in form of an array of numbers.
 * @param {string} text - The text to vectorize
 * @param {{model?: string}} [options] - Embedding model declaration
 * @returns {Promise<number[]>} - The vectorized text in form of an array of numbers
 */
export async function getTransformersVector(
    text,
    options = {},
) {
    const vectors =
        await getTransformersBatchVector(
            [text],
            options,
        );
    return vectors[0];
}

/**
 * Gets the vectorized texts in form of an array of arrays of numbers.
 * @param {string[]} texts - The texts to vectorize
 * @param {{model?: string}} [options] - Embedding model declaration
 * @returns {Promise<number[][]>} - The vectorized texts in form of an array of arrays of numbers
 */
export async function getTransformersBatchVector(
    texts,
    options = {},
) {
    if (
        !Array.isArray(texts) ||
        texts.some(text =>
            typeof text !== 'string')
    ) {
        throw new TypeError(
            'Transformers embedding input must be an array of strings.',
        );
    }
    if (texts.length === 0) {
        return [];
    }
    assertEmbeddingModel(
        options?.model,
    );
    return serializeEmbeddingRun(
        async () => {
            clearEmbeddingIdleTimer();
            const vectors = [];
            try {
                const pipe =
                    await getPipeline(
                        TASK,
                    );
                clampEmbeddingTokenizer(
                    pipe,
                );
                for (
                    let offset = 0;
                    offset < texts.length;
                    offset +=
                        TRANSFORMERS_EMBEDDING_BATCH_SIZE
                ) {
                    const batch =
                        texts.slice(
                            offset,
                            offset +
                            TRANSFORMERS_EMBEDDING_BATCH_SIZE,
                        );
                    vectors.push(
                        ...await runEmbeddingBatch(
                            pipe,
                            batch,
                        ),
                    );
                }
                return vectors;
            } finally {
                scheduleEmbeddingDispose();
            }
        },
    );
}

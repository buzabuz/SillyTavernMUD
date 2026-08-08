import {
    disposePipeline,
    getPipeline,
} from '../transformers.js';
import { getConfigValue } from '../util.js';
const TASK = 'feature-extraction';
export const TRANSFORMERS_EMBEDDING_MAX_TOKENS = 512;
const DEFAULT_EMBEDDING_IDLE_MS = 300_000;

let embeddingIdleTimer = null;

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

async function runEmbedding(pipe, text) {
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
    const result = await pipe(
        text,
        {
            pooling: 'mean',
            normalize: true,
        },
    );
    return Array.from(
        result.data,
    );
}

/**
 * Gets the vectorized text in form of an array of numbers.
 * @param {string} text - The text to vectorize
 * @returns {Promise<number[]>} - The vectorized text in form of an array of numbers
 */
export async function getTransformersVector(text) {
    clearEmbeddingIdleTimer();
    try {
        const pipe =
            await getPipeline(TASK);
        return await runEmbedding(
            pipe,
            text,
        );
    } finally {
        scheduleEmbeddingDispose();
    }
}

/**
 * Gets the vectorized texts in form of an array of arrays of numbers.
 * @param {string[]} texts - The texts to vectorize
 * @returns {Promise<number[][]>} - The vectorized texts in form of an array of arrays of numbers
 */
export async function getTransformersBatchVector(texts) {
    clearEmbeddingIdleTimer();
    const result = [];
    try {
        const pipe =
            await getPipeline(TASK);
        for (const text of texts) {
            result.push(
                await runEmbedding(
                    pipe,
                    text,
                ),
            );
        }
        return result;
    } finally {
        scheduleEmbeddingDispose();
    }
}

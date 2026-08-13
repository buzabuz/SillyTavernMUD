import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals';

const getPipeline = jest.fn();
const disposePipeline = jest.fn()
    .mockResolvedValue(false);
let configuredEmbeddingModel =
    'Cohee/jina-embeddings-v2-base-en';

jest.unstable_mockModule('../src/transformers.js', () => ({
    disposePipeline,
    getPipeline,
}));

jest.unstable_mockModule('../src/util.js', () => ({
    getConfigValue:
        jest.fn((key, fallback) =>
            key ===
            'extensions.models.embedding'
                ? configuredEmbeddingModel
                : fallback),
}));

let embedding;

beforeAll(async () => {
    embedding =
        await import(
            '../src/vectors/embedding.js'
        );
});

beforeEach(() => {
    configuredEmbeddingModel =
        'Cohee/jina-embeddings-v2-base-en';
    getPipeline.mockReset();
    disposePipeline.mockClear();
});

function textIndex(text) {
    return Number(
        String(text)
            .replace('text-', ''),
    );
}

function createPipeline({
    dimensions = 3,
    resultFor,
    delayMs = 0,
} = {}) {
    let activeCalls = 0;
    let maximumActiveCalls = 0;
    const calls = [];
    const pipe =
        jest.fn(
            async (
                received,
                options,
            ) => {
                activeCalls += 1;
                maximumActiveCalls =
                    Math.max(
                        maximumActiveCalls,
                        activeCalls,
                    );
                const texts =
                    Array.isArray(received)
                        ? received
                        : [received];
                calls.push({
                    received,
                    options,
                });
                if (delayMs > 0) {
                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                delayMs,
                            ),
                    );
                }
                const result =
                    resultFor
                        ? resultFor(texts)
                        : {
                            dims: [
                                texts.length,
                                dimensions,
                            ],
                            data:
                                new Float32Array(
                                    texts.flatMap(
                                        text => {
                                            const index =
                                                textIndex(
                                                    text,
                                                );
                                            return Array
                                                .from(
                                                    {
                                                        length:
                                                            dimensions,
                                                    },
                                                    (
                                                        _,
                                                        offset,
                                                    ) =>
                                                        index *
                                                        10 +
                                                        offset,
                                                );
                                        },
                                    ),
                                ),
                        };
                activeCalls -= 1;
                return result;
            },
        );
    pipe.tokenizer = {
        model_max_length: 8_192,
    };
    return {
        calls,
        get maximumActiveCalls() {
            return maximumActiveCalls;
        },
        pipe,
    };
}

describe('transformers embedding micro-batches', () => {
    test('embeds 23 texts as ordered 10/10/3 string-array micro-batches', async () => {
        const fake =
            createPipeline();
        getPipeline
            .mockResolvedValue(
                fake.pipe,
            );
        const texts =
            Array.from(
                { length: 23 },
                (_, index) =>
                    `text-${index}`,
            );

        const vectors =
            await embedding
                .getTransformersBatchVector(
                    texts,
                    {
                        model:
                            configuredEmbeddingModel,
                    },
                );

        expect(
            embedding
                .TRANSFORMERS_EMBEDDING_BATCH_SIZE,
        ).toBe(10);
        expect(getPipeline)
            .toHaveBeenCalledTimes(1);
        expect(
            fake.calls.map(
                call =>
                    call.received.length,
            ),
        ).toEqual([10, 10, 3]);
        expect(
            fake.calls.every(
                call =>
                    Array.isArray(
                        call.received,
                    ),
            ),
        ).toBe(true);
        expect(
            fake.calls.flatMap(
                call =>
                    call.received,
            ),
        ).toEqual(texts);
        expect(
            fake.calls.map(
                call =>
                    call.options,
            ),
        ).toEqual([
            {
                pooling: 'mean',
                normalize: true,
            },
            {
                pooling: 'mean',
                normalize: true,
            },
            {
                pooling: 'mean',
                normalize: true,
            },
        ]);
        expect(
            fake.pipe.tokenizer
                .model_max_length,
        ).toBe(
            embedding
                .TRANSFORMERS_EMBEDDING_MAX_TOKENS,
        );
        expect(vectors).toHaveLength(23);
        expect(vectors[0])
            .toEqual([0, 1, 2]);
        expect(vectors[10])
            .toEqual([100, 101, 102]);
        expect(vectors[22])
            .toEqual([220, 221, 222]);
        expect(
            fake.maximumActiveCalls,
        ).toBe(1);
    });

    test('serializes concurrent callers that share the cached pipeline', async () => {
        const fake =
            createPipeline({
                delayMs: 5,
            });
        getPipeline
            .mockResolvedValue(
                fake.pipe,
            );

        const [
            first,
            second,
        ] = await Promise.all([
            embedding
                .getTransformersBatchVector(
                    ['text-1'],
                ),
            embedding
                .getTransformersBatchVector(
                    ['text-2'],
                ),
        ]);

        expect(first)
            .toEqual([[10, 11, 12]]);
        expect(second)
            .toEqual([[20, 21, 22]]);
        expect(
            fake.maximumActiveCalls,
        ).toBe(1);
    });

    test('returns an empty array without loading a pipeline', async () => {
        await expect(
            embedding
                .getTransformersBatchVector(
                    [],
                ),
        ).resolves.toEqual([]);
        expect(getPipeline)
            .not
            .toHaveBeenCalled();
    });

    test('routes a single text through the same batch semantics', async () => {
        const fake =
            createPipeline({
                dimensions: 2,
            });
        getPipeline
            .mockResolvedValue(
                fake.pipe,
            );

        const vector =
            await embedding
                .getTransformersVector(
                    'text-7',
                );

        expect(vector)
            .toEqual([70, 71]);
        expect(
            fake.calls[0]
                .received,
        ).toEqual(['text-7']);
        expect(
            fake.calls[0]
                .options,
        ).toEqual({
            pooling: 'mean',
            normalize: true,
        });
    });

    test('rejects tensor shapes that do not match the requested rows', async () => {
        const fake =
            createPipeline({
                resultFor:
                    texts => ({
                        dims: [
                            texts.length + 1,
                            2,
                        ],
                        data:
                            new Float32Array(
                                texts.length * 2,
                            ),
                    }),
            });
        getPipeline
            .mockResolvedValue(
                fake.pipe,
            );

        await expect(
            embedding
                .getTransformersBatchVector(
                    [
                        'text-1',
                        'text-2',
                    ],
                ),
        ).rejects.toThrow(
            /tensor shape.*2 rows/iu,
        );
    });

    test('rejects non-finite embedding values', async () => {
        const fake =
            createPipeline({
                resultFor:
                    () => ({
                        dims: [1, 2],
                        data:
                            new Float32Array(
                                [1, NaN],
                            ),
                    }),
            });
        getPipeline
            .mockResolvedValue(
                fake.pipe,
            );

        await expect(
            embedding
                .getTransformersBatchVector(
                    ['text-1'],
                ),
        ).rejects.toThrow(
            /non-finite/iu,
        );
    });

    test('fails before pipeline loading when the backend model declaration drifts', async () => {
        await expect(
            embedding
                .getTransformersBatchVector(
                    ['text-1'],
                    {
                        model:
                            'different/model',
                    },
                ),
        ).rejects.toThrow(
            /embedding model.*does not match/iu,
        );
        expect(getPipeline)
            .not
            .toHaveBeenCalled();
    });
});

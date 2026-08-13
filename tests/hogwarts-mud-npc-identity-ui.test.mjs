/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    buildNpcIdentityPromptProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-prompt-projection.js';
import {
    buildNpcIdentityDossierViewModel,
    createNpcIdentityDossierElement,
} from '../public/scripts/extensions/hogwarts-mud/ui/npc-identity-dossier.js';

const IVY_ID =
    'original_ivy_warrington';
const RON_ID =
    'canon_ronald_weasley';

class TestElement {
    constructor(tagName) {
        this.tagName =
            tagName.toUpperCase();
        this.className = '';
        this.children = [];
        this.attributes =
            new Map();
        this._textContent = '';
    }

    append(...children) {
        this.children.push(
            ...children.filter(Boolean),
        );
    }

    setAttribute(name, value) {
        this.attributes.set(
            name,
            String(value),
        );
    }

    getAttribute(name) {
        return this.attributes
            .get(name) ?? null;
    }

    set textContent(value) {
        this._textContent =
            String(value);
        this.children = [];
    }

    get textContent() {
        return [
            this._textContent,
            ...this.children.map(
                child =>
                    child.textContent,
            ),
        ].join('');
    }
}

const testDocument = {
    createElement(tagName) {
        return new TestElement(
            tagName,
        );
    },
};

function hasClass(
    element,
    className,
) {
    return element.className
        .split(/\s+/u)
        .includes(className);
}

function findAll(
    root,
    predicate,
) {
    const matches = [];
    const visit = element => {
        if (predicate(element)) {
            matches.push(element);
        }
        element.children
            .forEach(visit);
    };
    visit(root);
    return matches;
}

function findGroup(
    dossier,
    groupId,
) {
    return findAll(
        dossier,
        element =>
            element.getAttribute(
                'data-identity-group',
            ) === groupId,
    )[0];
}

function findField(
    group,
    label,
) {
    return findAll(
        group,
        element =>
            hasClass(
                element,
                'hpmud-identity-field',
            ) &&
            findAll(
                element,
                child =>
                    child.tagName ===
                        'DT' &&
                    child.textContent ===
                        label,
            ).length === 1,
    )[0];
}

function sourceLabels(
    element,
) {
    return findAll(
        element,
        child =>
            hasClass(
                child,
                'hpmud-identity-source',
            ),
    ).map(child =>
        child.textContent);
}

function createWorldState() {
    return {
        clock:
            '1991-09-02 · 12:00',
        actorLibrary: [{
            id: IVY_ID,
            name: '艾薇·沃灵顿',
            role: '斯莱特林学生',
            relationshipToPlayer:
                '同学',
            identity:
                normalizeNpcIdentity({
                    gender: {
                        code:
                            'female',
                        label:
                            'female',
                    },
                    birth: {
                        date:
                            '1980-02-03',
                        precision:
                            'exact',
                    },
                    education: [{
                        schoolId:
                            'hogwarts',
                        houseId:
                            'slytherin',
                        entryYear:
                            1991,
                        exitYear:
                            1998,
                        status:
                            'enrolled',
                    }],
                    lineage: {
                        status:
                            'half_blood',
                        basis:
                            'must stay hidden',
                    },
                    body: {
                        naturalHairColor:
                            '棕色',
                        hairColor:
                            '绿色',
                        hairStyle:
                            '齐肩短发',
                        eyeColor:
                            'unknown',
                        features: [{
                            type: 'scar',
                            description:
                                '左眉有一道细疤',
                            status:
                                'permanent',
                        }],
                        injuries: [{
                            type: 'cut',
                            description:
                                '右掌割伤',
                            status:
                                'active',
                            startedClock:
                                '1991-09-02 · 11:30',
                        }],
                        form: {
                            code: 'human',
                            label: '人形',
                        },
                    },
                    provenance: {
                        registryVersion:
                            17,
                        generatedBy:
                            'hidden_registry',
                        records: [{
                            fieldPath:
                                'lineage.status',
                            sourceTier:
                                'canon_book',
                            sourceRef:
                                'hidden-source-tier',
                        }],
                    },
                }),
        }, {
            id: RON_ID,
            name: '罗恩·韦斯莱',
            identity:
                normalizeNpcIdentity(),
        }],
        actors: [{
            id: IVY_ID,
            present: true,
        }],
        socialGraph: {
            identityClaims: [{
                id:
                    'ivy_self_lineage',
                subjectId: IVY_ID,
                fieldPath:
                    'lineage.status',
                value:
                    'pure_blood',
                sourceKind:
                    'self',
                speakerId: IVY_ID,
                sourceMessageIds: [7],
                witnessedBy: [
                    'player',
                ],
                clock:
                    '1991-09-02 · 11:45',
            }, {
                id:
                    'ron_other_lineage',
                subjectId: IVY_ID,
                fieldPath:
                    'lineage.status',
                value:
                    'muggle_born',
                sourceKind:
                    'other',
                speakerId: RON_ID,
                sourceMessageIds: [8],
                witnessedBy: [
                    'player',
                ],
                clock:
                    '1991-09-02 · 11:50',
            }],
            personReferences: [{
                id:
                    'ivy_brother_ref',
                label:
                    '艾薇自称的哥哥',
                status:
                    'nonexistent',
                actorId: '',
            }],
            relationshipClaims: [{
                id:
                    'ivy_brother_claim',
                subjectId: IVY_ID,
                relationshipKind:
                    'brother',
                targetRefId:
                    'ivy_brother_ref',
                sourceKind:
                    'self',
                speakerId: IVY_ID,
                sourceMessageIds: [9],
                witnessedBy: [
                    'player',
                ],
                clock:
                    '1991-09-02 · 11:55',
            }],
        },
    };
}

function createViewModel(
    state,
    onProjection =
    () => {},
) {
    return buildNpcIdentityDossierViewModel({
        worldState: state,
        actorId: IVY_ID,
        buildIdentityProjection(
            ...args
        ) {
            onProjection();
            return buildNpcIdentityPromptProjection(
                ...args,
            );
        },
    });
}

test('Identity dossier view model groups authority facts and keeps conflicting claims attributed', () => {
    const model =
        createViewModel(
            createWorldState(),
        );
    assert.deepEqual(
        model.groups.map(
            group =>
                group.title,
        ),
        [
            '基本身份',
            '教育',
            '血统',
            '身体状态',
            '已知说法',
        ],
    );

    const groups =
        new Map(
            model.groups.map(
                group => [
                    group.id,
                    group,
                ],
            ),
        );
    assert.deepEqual(
        groups.get('basic')
            .entries.map(entry =>
                entry.value),
        [
            '女',
            '1980-02-03',
            '11 岁',
        ],
    );
    assert.deepEqual(
        groups.get('education')
            .entries.map(entry =>
                entry.value),
        [
            '霍格沃茨',
            '斯莱特林',
            '1 年级 · 在学',
        ],
    );
    assert.equal(
        groups.get('lineage')
            .entries[0].value,
        '混血',
    );
    assert.deepEqual(
        groups.get('claims')
            .entries.map(entry => ({
                value: entry.value,
                sourceKind:
                    entry.sourceKind,
            })),
        [{
            value: '纯血',
            sourceKind: 'self',
        }, {
            value: '麻瓜出身',
            sourceKind: 'other',
        }],
    );

    const bodyText =
        groups.get('body')
            .entries.map(entry =>
                `${entry.label}:${entry.value}`)
            .join('|');
    assert.match(
        bodyText,
        /自然发色:棕色/u,
    );
    assert.match(
        bodyText,
        /当前发色 \/ 染发:绿色/u,
    );
    assert.match(
        bodyText,
        /发型:齐肩短发/u,
    );
    assert.match(
        bodyText,
        /疤痕:左眉有一道细疤\(永久\)/u,
    );
    assert.match(
        bodyText,
        /伤势:右掌割伤\(未愈\)/u,
    );
    assert.match(
        bodyText,
        /当前形态:人形/u,
    );
});

test('[defect-probing] Identity dossier shows exact year without age and never renders Birth ranges', () => {
    const yearState =
        createWorldState();
    yearState.actorLibrary[0]
        .identity.birth = {
            date: '',
            year: 1980,
            precision: 'year',
            earliest: '1980-01-01',
            latest: '1980-12-31',
        };
    const yearModel =
        createViewModel(
            yearState,
        );
    const yearBasic =
        yearModel.groups.find(
            group =>
                group.id ===
                'basic',
        );
    assert.deepEqual(
        yearBasic.entries
            .slice(1)
            .map(entry =>
                entry.value),
        [
            '1980',
            '未知',
        ],
    );
    const yearDossier =
        createNpcIdentityDossierElement(
            yearModel,
            testDocument,
        );
    assert.doesNotMatch(
        yearDossier.textContent,
        /至/u,
    );

    const rangeState =
        createWorldState();
    rangeState.actorLibrary[0]
        .identity.birth = {
            date: '',
            precision: 'range',
            earliest: '1979-09-01',
            latest: '1980-08-31',
        };
    const rangeModel =
        createViewModel(
            rangeState,
        );
    const rangeBasic =
        rangeModel.groups.find(
            group =>
                group.id ===
                'basic',
        );
    assert.deepEqual(
        rangeBasic.entries
            .slice(1)
            .map(entry =>
                entry.value),
        [
            '未知',
            '未知',
        ],
    );
    assert.doesNotMatch(
        createNpcIdentityDossierElement(
            rangeModel,
            testDocument,
        ).textContent,
        /至/u,
    );
});

test('Identity dossier keeps zero player-known claims as a true empty state', () => {
    const state =
        createWorldState();
    state.socialGraph
        .identityClaims = [];
    const model =
        createViewModel(state);
    const claims =
        model.groups.find(
            group =>
                group.id ===
                'claims',
        );
    const dossier =
        createNpcIdentityDossierElement(
            model,
            testDocument,
        );

    assert.deepEqual(
        claims.entries,
        [],
    );
    assert.equal(
        findAll(
            dossier,
            element =>
                hasClass(
                    element,
                    'hpmud-identity-empty',
                ),
        ).length,
        1,
    );
    assert.match(
        dossier.textContent,
        /已知说法暂无已知说法/u,
    );
    assert.doesNotMatch(
        dossier.textContent,
        /暂无已知说法未知/u,
    );
});

test('Identity dossier DOM exposes semantic classes, focus and low-contrast unknowns', () => {
    const model =
        createViewModel(
            createWorldState(),
        );
    const dossier =
        createNpcIdentityDossierElement(
            model,
            testDocument,
        );

    assert.equal(
        hasClass(
            dossier,
            'hpmud-identity-dossier',
        ),
        true,
    );
    assert.equal(
        dossier.getAttribute(
            'tabindex',
        ),
        '0',
    );
    assert.equal(
        dossier.getAttribute(
            'aria-label',
        ),
        '艾薇·沃灵顿的只读身份档案',
    );
    assert.deepEqual(
        findAll(
            dossier,
            element =>
                element.getAttribute(
                    'data-identity-group',
                ),
        ).map(element =>
            element.getAttribute(
                'data-identity-group',
            )),
        [
            'basic',
            'education',
            'lineage',
            'body',
            'claims',
        ],
    );
    assert.equal(
        findAll(
            dossier,
            element =>
                hasClass(
                    element,
                    'is-authority',
                ),
        ).length >= 4,
        true,
    );
    assert.equal(
        findAll(
            dossier,
            element =>
                hasClass(
                    element,
                    'is-self',
                ),
        ).length,
        1,
    );
    assert.equal(
        findAll(
            dossier,
            element =>
                hasClass(
                    element,
                    'is-other',
                ),
        ).length,
        1,
    );
    assert.equal(
        findAll(
            dossier,
            element =>
                hasClass(
                    element,
                    'is-unknown',
                ),
        ).length > 0,
        true,
    );
    assert.match(
        dossier.textContent,
        /基本身份.*教育.*血统.*身体状态.*已知说法/u,
    );
    assert.match(
        dossier.textContent,
        /纯血自称/u,
    );
    assert.match(
        dossier.textContent,
        /麻瓜出身他称/u,
    );
});

test('Identity module headers never own source badges', () => {
    const model =
        createViewModel(
            createWorldState(),
        );
    const dossier =
        createNpcIdentityDossierElement(
            model,
            testDocument,
        );

    assert.deepEqual(
        model.groups.map(group =>
            group.sourceKind),
        [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
        ],
        'sourceKind belongs to entries, not module view models',
    );
    for (
        const header
        of findAll(
            dossier,
            element =>
                element.tagName ===
                'HEADER',
        )
    ) {
        assert.deepEqual(
            sourceLabels(header),
            [],
            `header "${header.textContent}" must not own a source badge`,
        );
    }
});

test('known authority fields render authority badges on their own rows', () => {
    const dossier =
        createNpcIdentityDossierElement(
            createViewModel(
                createWorldState(),
            ),
            testDocument,
        );
    const expectedFields = [
        ['basic', '性别', 'authority', '权威'],
        ['basic', '出生', 'authority', '权威'],
        ['education', '学校', 'authority', '权威'],
        ['education', '学院', 'authority', '权威'],
        ['lineage', '血统状态', 'authority', '权威'],
        ['body', '自然发色', 'authority', '权威'],
    ];
    for (
        const [
            groupId,
            label,
            sourceKind,
            sourceLabel,
        ]
        of expectedFields
    ) {
        const field =
            findField(
                findGroup(
                    dossier,
                    groupId,
                ),
                label,
            );
        assert.equal(
            field.getAttribute(
                'data-identity-source',
            ),
            sourceKind,
            `${label} should expose ${sourceKind}`,
        );
        assert.deepEqual(
            sourceLabels(field),
            [sourceLabel],
            `${label} should render ${sourceLabel} on its row`,
        );
    }
});

test('computed age and school status render derived badges on their own rows', () => {
    const model =
        createViewModel(
            createWorldState(),
        );
    const dossier =
        createNpcIdentityDossierElement(
            model,
            testDocument,
        );
    const expectedFields = [
        ['basic', '当前年龄'],
        ['education', '当前学籍'],
    ];

    for (
        const [
            groupId,
            label,
        ]
        of expectedFields
    ) {
        const entry =
            model.groups
                .find(group =>
                    group.id ===
                    groupId)
                .entries
                .find(candidate =>
                    candidate.label ===
                    label);
        const field =
            findField(
                findGroup(
                    dossier,
                    groupId,
                ),
                label,
            );
        assert.equal(
            entry.sourceKind,
            'derived',
            `${label} view model source should be derived`,
        );
        assert.equal(
            field.getAttribute(
                'data-identity-source',
            ),
            'derived',
            `${label} should expose derived`,
        );
        assert.deepEqual(
            sourceLabels(field),
            ['派生'],
            `${label} should render 派生 on its row`,
        );
    }
});

test('conflicting Identity claims keep self and other badges on their own rows', () => {
    const dossier =
        createNpcIdentityDossierElement(
            createViewModel(
                createWorldState(),
            ),
            testDocument,
        );
    const claimFields =
        findAll(
            findGroup(
                dossier,
                'claims',
            ),
            element =>
                hasClass(
                    element,
                    'hpmud-identity-field',
                ),
        );

    assert.deepEqual(
        claimFields.map(field => ({
            value:
                findAll(
                    field,
                    element =>
                        element.tagName ===
                        'DD',
                )[0].children[0]
                    .textContent,
            sourceKind:
                field.getAttribute(
                    'data-identity-source',
                ),
            sourceLabels:
                sourceLabels(field),
        })),
        [{
            value: '纯血',
            sourceKind: 'self',
            sourceLabels: ['自称'],
        }, {
            value: '麻瓜出身',
            sourceKind: 'other',
            sourceLabels: ['他称'],
        }],
    );
});

test('unknown Identity fields keep their placeholder without authority semantics', () => {
    const model =
        createViewModel(
            createWorldState(),
        );
    const eyeEntry =
        model.groups
            .find(group =>
                group.id ===
                'body')
            .entries
            .find(entry =>
                entry.label ===
                '眼睛');
    const dossier =
        createNpcIdentityDossierElement(
            model,
            testDocument,
        );
    const eyeField =
        findField(
            findGroup(
                dossier,
                'body',
            ),
            '眼睛',
        );

    assert.equal(
        eyeEntry.value,
        '未知',
    );
    assert.equal(
        eyeEntry.unknown,
        true,
    );
    assert.equal(
        eyeEntry.sourceKind,
        '',
    );
    assert.equal(
        eyeField.getAttribute(
            'data-identity-source',
        ),
        null,
    );
    assert.deepEqual(
        sourceLabels(eyeField),
        [],
    );
});

test('family claims stay outside Identity DOM and backend metadata remains hidden', () => {
    const model =
        createViewModel(
            createWorldState(),
        );
    const dossier =
        createNpcIdentityDossierElement(
            model,
            testDocument,
        );

    assert.equal(
        model.relationshipClaims
            .length,
        1,
    );
    assert.match(
        model.relationshipClaims[0]
            .label,
        /兄弟.*艾薇自称的哥哥/u,
    );
    assert.doesNotMatch(
        dossier.textContent,
        /哥哥|家庭|亲属/u,
    );
    assert.doesNotMatch(
        dossier.textContent,
        /source.?tier|revision|registry|nonexistent|hidden-source/iu,
    );
    assert.doesNotMatch(
        JSON.stringify(model),
        /sourceMessageIds|sourceTier|registryVersion|nonexistent|hidden-source/u,
    );
});

test('Identity UI projection and DOM rendering are read-only', () => {
    const state =
        createWorldState();
    const before =
        structuredClone(state);
    let projectionCalls = 0;
    const model =
        createViewModel(
            state,
            () => {
                projectionCalls++;
            },
        );
    createNpcIdentityDossierElement(
        model,
        testDocument,
    );

    assert.equal(
        projectionCalls,
        2,
        'authority and player capsules are projected without extra work',
    );
    assert.deepEqual(
        state,
        before,
        'rendering must not mutate world authority',
    );
});

test('Inspector and dossier styles preserve presentation, narrow-screen and motion boundaries', async () => {
    const [
        dossierSource,
        inspectorSource,
        styleSource,
    ] = await Promise.all([
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/npc-identity-dossier.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/inspector-controller.js',
                import.meta.url,
            ),
            'utf8',
        ),
        readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/style.css',
                import.meta.url,
            ),
            'utf8',
        ),
    ]);
    const identityStyles =
        styleSource.slice(
            styleSource.indexOf(
                '/* NPC Identity dossier */',
            ),
            styleSource.indexOf(
                '/* Calendar:',
            ),
        );
    const presentationSource =
        inspectorSource.slice(
            inspectorSource.indexOf(
                'const currentPresentation',
            ),
            inspectorSource.indexOf(
                'const itemList',
            ),
        );

    assert.match(
        inspectorSource,
        /buildActorDossierViewModel/u,
    );
    assert.match(
        inspectorSource,
        /dossier\.identity/u,
    );
    assert.match(
        inspectorSource,
        /identity\.claims/u,
    );
    assert.doesNotMatch(
        inspectorSource,
        /buildNpcIdentityDossierViewModel/u,
    );
    assert.doesNotMatch(
        inspectorSource,
        /state\.(?:actorLibrary|actors|socialGraph)/u,
    );
    assert.match(
        presentationSource,
        /\.outfit/u,
    );
    assert.match(
        presentationSource,
        /\.wornItemIds/u,
    );
    assert.match(
        presentationSource,
        /\.accessories/u,
    );
    assert.match(
        presentationSource,
        /\.heldItemIds/u,
    );
    assert.doesNotMatch(
        presentationSource,
        /\.hair|visibleConditions|当前发型|可见状态/u,
    );
    assert.match(
        identityStyles,
        /\.hpmud-identity-dossier:focus-visible/u,
    );
    assert.match(
        identityStyles,
        /@media \(max-width: 390px\)[\s\S]*?\.hpmud-identity-grid[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/u,
    );
    assert.match(
        identityStyles,
        /@media \(max-width: 390px\)[\s\S]*?\.hpmud-topbar[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto/u,
    );
    assert.match(
        identityStyles,
        /@media \(max-width: 390px\)[\s\S]*?\.hpmud-top-actions[\s\S]*?min-width: 0[\s\S]*?max-width: 100%/u,
    );
    assert.match(
        identityStyles,
        /@media \(max-width: 390px\)[\s\S]*?\.hpmud-identity-dossier[\s\S]*?max-width: 100%/u,
    );
    assert.match(
        identityStyles,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hpmud-identity-dossier[\s\S]*?animation: none !important/u,
    );
    assert.match(
        identityStyles,
        /--identity-midnight: #0b1025/u,
    );
    assert.match(
        identityStyles,
        /--identity-green: #132a28/u,
    );
    assert.match(
        identityStyles,
        /--identity-gold: #c8ac68/u,
    );
    assert.match(
        identityStyles,
        /--identity-violet: #a78add/u,
    );
    assert.doesNotMatch(
        identityStyles,
        /url\(|@import/u,
    );
    assert.doesNotMatch(
        dossierSource,
        /saveMetadata|saveChat|sendRoleRequest|fetch\(|setTimeout|setInterval|scrollTo|scrollIntoView/u,
    );
});

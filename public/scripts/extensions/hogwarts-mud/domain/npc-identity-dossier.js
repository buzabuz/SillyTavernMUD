export const IDENTITY_SOURCE_LABELS =
    Object.freeze({
        authority: '权威',
        derived: '派生',
        observation: '观察',
        self: '自称',
        other: '他称',
    });

const GENDER_LABELS = Object.freeze({
    female: '女',
    male: '男',
    nonbinary: '非二元',
    other: '其他',
    unknown: '未知',
});

const LINEAGE_LABELS = Object.freeze({
    pure_blood: '纯血',
    half_blood: '混血',
    muggle_born: '麻瓜出身',
    muggle: '麻瓜',
    unknown: '未知',
});

const EDUCATION_STATUS_LABELS =
    Object.freeze({
        prospective: '待入学',
        enrolled: '在学',
        graduated: '已毕业',
        left: '离校',
        expelled: '被开除',
        unknown: '未知',
    });

const HEIGHT_LABELS = Object.freeze({
    very_short: '很矮',
    short: '偏矮',
    average: '中等',
    tall: '偏高',
    very_tall: '很高',
    unknown: '未知',
});

const FEATURE_STATUS_LABELS =
    Object.freeze({
        active: '当前',
        resolved: '已恢复',
        permanent: '永久',
        unknown: '状态未知',
    });

const INJURY_STATUS_LABELS =
    Object.freeze({
        active: '未愈',
        resolved: '已恢复',
        chronic: '长期',
        unknown: '状态未知',
    });

const SCHOOL_LABELS = Object.freeze({
    hogwarts: '霍格沃茨',
    beauxbatons: '布斯巴顿',
    durmstrang: '德姆斯特朗',
    unknown: '未知',
});

const HOUSE_LABELS = Object.freeze({
    gryffindor: '格兰芬多',
    slytherin: '斯莱特林',
    ravenclaw: '拉文克劳',
    hufflepuff: '赫奇帕奇',
    unknown: '未知',
});

const RELATIONSHIP_LABELS =
    Object.freeze({
        family: '亲属',
        parent: '父母',
        child: '子女',
        sibling: '兄弟姐妹',
        brother: '兄弟',
        sister: '姐妹',
        guardian: '监护人',
        ward: '被监护人',
        spouse: '配偶',
        partner: '伴侣',
        relative: '亲属',
        cousin: '堂表亲',
        grandparent: '祖辈',
        grandchild: '孙辈',
        aunt: '姨姑',
        uncle: '叔舅',
        niece: '侄甥女',
        nephew: '侄甥',
    });

function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function text(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

function knownText(value) {
    const normalized = text(value);
    return normalized &&
        normalized.toLocaleLowerCase() !==
            'unknown'
        ? normalized
        : '';
}

function localizedValue(
    value,
    labels,
) {
    const normalized =
        knownText(value);
    if (!normalized) return '';
    return labels[
        normalized
            .toLocaleLowerCase()
    ] || normalized;
}

function viewEntry(
    label,
    value,
    {
        detail = '',
        sourceKind =
        'authority',
    } = {},
) {
    const normalized =
        knownText(value);
    return {
        label,
        value:
            normalized ||
            '未知',
        detail: text(detail),
        sourceKind:
            normalized
                ? sourceKind
                : '',
        unknown: !normalized,
    };
}

function actorDirectory(
    worldState,
) {
    const directory =
        new Map();
    for (const actor of [
        ...asArray(
            worldState?.actors,
        ),
        ...asArray(
            worldState
                ?.actorLibrary,
        ),
    ]) {
        if (!actor?.id) continue;
        directory.set(
            actor.id,
            {
                ...(directory.get(
                    actor.id,
                ) || {}),
                ...actor,
            },
        );
    }
    directory.set('player', {
        id: 'player',
        name:
            worldState?.character
                ?.identity?.name ||
            '你',
    });
    return directory;
}

function actorName(
    directory,
    actorId,
) {
    const actor =
        directory.get(actorId);
    return actor?.name ||
        actor?.nameEn ||
        actorId ||
        '未知人物';
}

function formatBirth(birth) {
    if (
        birth?.precision ===
            'exact'
    ) {
        return knownText(
            birth.date,
        );
    }
    if (
        birth?.precision ===
            'year' &&
        Number.isInteger(
            birth.year,
        )
    ) {
        return String(
            birth.year,
        );
    }
    return '';
}

function formatAge(age) {
    if (
        Number.isFinite(
            age?.years,
        )
    ) {
        return `${age.years} 岁`;
    }
    return '';
}

function formatHeight(height) {
    if (
        Number.isFinite(
            height?.centimeters,
        )
    ) {
        const prefix =
            height.precision ===
                'approximate'
                ? '约 '
                : '';
        return `${prefix}${height.centimeters} cm`;
    }
    return localizedValue(
        height?.category,
        HEIGHT_LABELS,
    );
}

function formatFeature(
    feature,
) {
    const description =
        knownText(
            feature?.description,
        );
    if (!description) return '';
    const status =
        localizedValue(
            feature?.status,
            FEATURE_STATUS_LABELS,
        );
    return [
        description,
        status &&
            `（${status}）`,
    ].filter(Boolean).join('');
}

function formatInjury(
    injury,
) {
    const description =
        knownText(
            injury?.description,
        );
    if (!description) return '';
    const status =
        localizedValue(
            injury?.status,
            INJURY_STATUS_LABELS,
        );
    return [
        description,
        status &&
            `（${status}）`,
    ].filter(Boolean).join('');
}

function formatEducationStatus(
    record,
) {
    const current =
        record?.current || {};
    if (
        Number.isInteger(
            current.currentYear,
        )
    ) {
        return `${current.currentYear} 年级 · 在学`;
    }
    return localizedValue(
        current.status ||
            record?.status,
        EDUCATION_STATUS_LABELS,
    );
}

function educationEntries(
    education,
) {
    if (!education.length) {
        return [
            viewEntry(
                '学校',
                '',
            ),
            viewEntry(
                '学院',
                '',
            ),
            viewEntry(
                '当前学籍',
                '',
            ),
        ];
    }
    return education.flatMap(
        (record, index) => {
            const suffix =
                education.length > 1
                    ? ` ${index + 1}`
                    : '';
            return [
                viewEntry(
                    `学校${suffix}`,
                    localizedValue(
                        record.schoolId,
                        SCHOOL_LABELS,
                    ),
                ),
                viewEntry(
                    `学院${suffix}`,
                    localizedValue(
                        record.houseId,
                        HOUSE_LABELS,
                    ),
                ),
                viewEntry(
                    `当前学籍${suffix}`,
                    formatEducationStatus(
                        record,
                    ),
                    {
                        sourceKind:
                            'derived',
                    },
                ),
            ];
        },
    );
}

function bodyEntries(body = {}) {
    const features =
        asArray(body.features);
    const scars =
        features
            .filter(feature =>
                feature.type ===
                    'scar')
            .map(formatFeature)
            .filter(Boolean);
    const otherFeatures =
        features
            .filter(feature =>
                feature.type !==
                    'scar')
            .map(formatFeature)
            .filter(Boolean);
    const injuries =
        asArray(body.injuries)
            .map(formatInjury)
            .filter(Boolean);
    const injuryAssessment =
        body.injuryAssessment ||
        {};
    const injuryValue =
        injuries.join('；') ||
        (
            injuryAssessment
                .status ===
                'no_visible_injury'
                ? '未观察到伤势'
                : ''
        );
    const injuryObserved =
        injuryAssessment.status ===
            'no_visible_injury' ||
        injuryAssessment.status ===
            'visible_injury';
    return [
        viewEntry(
            '身高',
            formatHeight(
                body.height,
            ),
        ),
        viewEntry(
            '体型',
            knownText(
                body.build,
            ),
        ),
        viewEntry(
            '自然发色',
            knownText(
                body
                    .naturalHairColor,
            ),
        ),
        viewEntry(
            '当前发色 / 染发',
            knownText(
                body.hairColor,
            ),
        ),
        viewEntry(
            '发型',
            knownText(
                body.hairStyle,
            ),
        ),
        viewEntry(
            '眼睛',
            knownText(
                body.eyeColor,
            ),
        ),
        viewEntry(
            '疤痕',
            scars.join('；'),
        ),
        viewEntry(
            '伤势',
            injuryValue,
            injuryObserved
                ? {
                    sourceKind:
                        'observation',
                    detail:
                        knownText(
                            injuryAssessment
                                .asOfClock,
                        )
                            ? `截至 ${injuryAssessment.asOfClock}`
                            : '',
                }
                : {},
        ),
        viewEntry(
            '其他身体特征',
            otherFeatures.join(
                '；',
            ),
        ),
        viewEntry(
            '当前形态',
            knownText(
                body.form?.label,
            ) ||
            knownText(
                body.form?.code,
            ),
        ),
    ];
}

function claimFieldLabel(
    fieldPath,
) {
    const path =
        text(fieldPath)
            .replace(
                /^identity\./u,
                '',
            );
    if (
        path.startsWith(
            'gender',
        )
    ) {
        return '性别';
    }
    if (
        path.startsWith(
            'birth',
        )
    ) {
        return '出生';
    }
    if (
        path.startsWith(
            'education',
        )
    ) {
        return '教育';
    }
    if (
        path.startsWith(
            'lineage',
        )
    ) {
        return '血统';
    }
    if (
        path.includes(
            'hairStyle',
        )
    ) {
        return '发型';
    }
    if (
        path.includes(
            'hairColor',
        )
    ) {
        return '发色';
    }
    if (
        path.includes(
            'injur',
        )
    ) {
        return '伤势';
    }
    if (
        path.includes(
            'feature',
        )
    ) {
        return '身体特征';
    }
    if (
        path.includes(
            'form',
        )
    ) {
        return '当前形态';
    }
    if (
        path.startsWith(
            'body',
        )
    ) {
        return '身体状态';
    }
    return '身份';
}

function objectClaimValue(
    value,
) {
    if (!value) return '';
    const preferred = [
        value.label,
        value.description,
        value.status,
        value.code,
        value.schoolId,
        value.houseId,
        value.date,
    ]
        .map(knownText)
        .filter(Boolean);
    return [
        ...new Set(preferred),
    ].join(' · ');
}

function formatClaimValue(
    claim,
) {
    const path =
        text(claim.fieldPath);
    const value =
        claim.value;
    const raw =
        typeof value ===
            'object'
            ? objectClaimValue(
                value,
            )
            : knownText(value);
    if (
        path.startsWith(
            'gender',
        )
    ) {
        return localizedValue(
            value?.code ||
                raw,
            GENDER_LABELS,
        );
    }
    if (
        path.startsWith(
            'lineage',
        )
    ) {
        return localizedValue(
            value?.status ||
                raw,
            LINEAGE_LABELS,
        );
    }
    if (
        path.startsWith(
            'birth',
        ) &&
        typeof value ===
            'object'
    ) {
        return formatBirth(value);
    }
    return raw;
}

function identityClaimEntries(
    claims,
    directory,
) {
    if (!claims.length) {
        return [];
    }
    return claims.map(claim =>
        viewEntry(
            claimFieldLabel(
                claim.fieldPath,
            ),
            formatClaimValue(
                claim,
            ),
            {
                sourceKind:
                    claim.sourceKind,
                detail:
                    claim.sourceKind ===
                        'self'
                        ? '由本人说出'
                        : `由 ${actorName(
                            directory,
                            claim.speakerId,
                        )} 提及`,
            },
        ));
}

function relationshipClaimEntries(
    claims,
    references,
    directory,
) {
    const referenceById =
        new Map(
            references.map(
                reference => [
                    reference.id,
                    reference,
                ],
            ),
        );
    return claims.map(claim => {
        const reference =
            referenceById.get(
                claim.targetRefId,
            );
        const target =
            knownText(
                reference?.label,
            ) ||
            '未具名人物';
        return {
            label: [
                RELATIONSHIP_LABELS[
                    claim
                        .relationshipKind
                ] ||
                claim
                    .relationshipKind ||
                '关系',
                target,
            ].join(' · '),
            detail:
                claim.sourceKind ===
                    'self'
                    ? '由本人说出'
                    : claim.sourceKind ===
                        'other'
                        ? `由 ${actorName(
                            directory,
                            claim.speakerId,
                        )} 提及`
                        : '已确认的关系记录',
            sourceKind:
                claim.sourceKind,
        };
    });
}

function emptyAuthorityProjection() {
    return {
        gender: {
            code: 'unknown',
            label: '',
        },
        birth: {
            date: '',
            year: null,
            precision: 'unknown',
        },
        education: [],
        lineage: {
            status: 'unknown',
        },
        body: {
            height: {
                category: 'unknown',
            },
            build: 'unknown',
            naturalHairColor:
                'unknown',
            hairColor: 'unknown',
            hairStyle: 'unknown',
            eyeColor: 'unknown',
            features: [],
            injuries: [],
            injuryAssessment: {
                status: 'unknown',
                summary: '',
                asOfClock: '',
            },
            form: {
                code: 'unknown',
                label: '',
            },
        },
        derived: {
            age: {
                years: null,
                minimumYears: null,
                maximumYears: null,
            },
        },
    };
}

export function buildNpcIdentityDossierViewModel({
    worldState = {},
    actorId,
    buildIdentityProjection,
}) {
    const directory =
        actorDirectory(
            worldState,
        );
    const actor =
        directory.get(actorId) ||
        {};
    const clock =
        worldState.clock || '';
    const authorityCapsule =
        typeof buildIdentityProjection ===
            'function'
            ? buildIdentityProjection(
                worldState,
                actorId,
                'authority',
                {
                    clock,
                },
            )
            : null;
    const playerCapsule =
        typeof buildIdentityProjection ===
            'function'
            ? buildIdentityProjection(
                worldState,
                actorId,
                'player',
                {
                    clock,
                },
            )
            : null;
    const authority =
        authorityCapsule
            ?.authority ||
        emptyAuthorityProjection();
    const claims =
        playerCapsule?.claims ||
        {
            identityClaims: [],
            relationshipClaims:
                [],
            personReferences: [],
        };
    const name =
        actorName(
            directory,
            actorId,
        );
    const subtitle = [
        actor.role ||
            actor.roleEn,
        actor
            .relationshipToPlayer,
    ].filter(Boolean).join(' · ');

    return {
        actorId:
            text(actorId),
        name,
        subtitle:
            subtitle ||
            '人物身份档案',
        groups: [
            {
                id: 'basic',
                title: '基本身份',
                entries: [
                    viewEntry(
                        '性别',
                        localizedValue(
                            authority
                                .gender
                                ?.code,
                            GENDER_LABELS,
                        ) ||
                        knownText(
                            authority
                                .gender
                                ?.label,
                        ),
                    ),
                    viewEntry(
                        '出生',
                        formatBirth(
                            authority
                                .birth,
                        ),
                    ),
                    viewEntry(
                        '当前年龄',
                        formatAge(
                            authority
                                .derived
                                ?.age,
                        ),
                        {
                            sourceKind:
                                'derived',
                        },
                    ),
                ],
            },
            {
                id: 'education',
                title: '教育',
                entries:
                    educationEntries(
                        authority
                            .education ||
                        [],
                    ),
            },
            {
                id: 'lineage',
                title: '血统',
                entries: [
                    viewEntry(
                        '血统状态',
                        localizedValue(
                            authority
                                .lineage
                                ?.status,
                            LINEAGE_LABELS,
                        ),
                    ),
                ],
            },
            {
                id: 'body',
                title: '身体状态',
                entries:
                    bodyEntries(
                        authority.body,
                    ),
            },
            {
                id: 'claims',
                title: '已知说法',
                emptyText:
                    '暂无已知说法',
                entries:
                    identityClaimEntries(
                        claims
                            .identityClaims ||
                        [],
                        directory,
                    ),
            },
        ],
        relationshipClaims:
            relationshipClaimEntries(
                claims
                    .relationshipClaims ||
                [],
                claims
                    .personReferences ||
                [],
                directory,
            ),
    };
}

function createSourceTag(
    documentRef,
    sourceKind,
) {
    const label =
        IDENTITY_SOURCE_LABELS[
            sourceKind
        ];
    if (!label) return null;
    const tag =
        documentRef.createElement(
            'span',
        );
    tag.className =
        `hpmud-identity-source is-${sourceKind}`;
    tag.textContent = label;
    return tag;
}

function initials(value) {
    const parts =
        text(value)
            .split(/\s+/u)
            .filter(Boolean);
    if (parts.length > 1) {
        return parts
            .slice(0, 2)
            .map(part =>
                [...part][0])
            .join('')
            .toLocaleUpperCase();
    }
    return [...(
        parts[0] || '?'
    )].slice(0, 2)
        .join('')
        .toLocaleUpperCase();
}

export function createNpcIdentityDossierElement(
    viewModel,
    documentRef =
    globalThis.document,
) {
    const dossier =
        documentRef.createElement(
            'section',
        );
    dossier.className =
        'hpmud-inspector-card hpmud-identity-dossier';
    dossier.setAttribute(
        'tabindex',
        '0',
    );
    dossier.setAttribute(
        'aria-label',
        `${viewModel.name}的只读身份档案`,
    );

    const header =
        documentRef.createElement(
            'header',
        );
    header.className =
        'hpmud-identity-header';
    const sigil =
        documentRef.createElement(
            'span',
        );
    sigil.className =
        'hpmud-identity-sigil';
    sigil.textContent =
        initials(
            viewModel.name,
        );
    sigil.setAttribute(
        'aria-hidden',
        'true',
    );
    const copy =
        documentRef.createElement(
            'span',
        );
    const eyebrow =
        documentRef.createElement(
            'small',
        );
    eyebrow.textContent =
        'IDENTITY DOSSIER';
    const title =
        documentRef.createElement(
            'h2',
        );
    title.textContent =
        viewModel.name;
    const subtitle =
        documentRef.createElement(
            'p',
        );
    subtitle.textContent =
        viewModel.subtitle;
    copy.append(
        eyebrow,
        title,
        subtitle,
    );
    header.append(
        sigil,
        copy,
    );

    const grid =
        documentRef.createElement(
            'div',
        );
    grid.className =
        'hpmud-identity-grid';
    for (
        const group
        of viewModel.groups
    ) {
        const section =
            documentRef.createElement(
                'section',
            );
        section.className =
            `hpmud-identity-group is-${group.id}`;
        section.setAttribute(
            'data-identity-group',
            group.id,
        );
        const groupHeader =
            documentRef.createElement(
                'header',
            );
        const groupTitle =
            documentRef.createElement(
                'h3',
            );
        groupTitle.textContent =
            group.title;
        groupHeader.append(
            groupTitle,
        );
        const fields =
            documentRef.createElement(
                group.entries.length
                    ? 'dl'
                    : 'p',
            );
        if (!group.entries.length) {
            fields.className =
                'hpmud-identity-empty';
            fields.textContent =
                group.emptyText ||
                '暂无';
        }
        for (
            const entry
            of group.entries
        ) {
            const field =
                documentRef.createElement(
                    'div',
                );
            field.className = [
                'hpmud-identity-field',
                entry.unknown
                    ? 'is-unknown'
                    : '',
                entry.sourceKind
                    ? `source-${entry.sourceKind}`
                    : '',
            ].filter(Boolean).join(' ');
            if (entry.sourceKind) {
                field.setAttribute(
                    'data-identity-source',
                    entry.sourceKind,
                );
            }
            const term =
                documentRef.createElement(
                    'dt',
                );
            term.textContent =
                entry.label;
            const description =
                documentRef.createElement(
                    'dd',
                );
            const value =
                documentRef.createElement(
                    'span',
                );
            value.textContent =
                entry.value;
            description.append(
                value,
            );
            const entrySource =
                createSourceTag(
                    documentRef,
                    entry.sourceKind,
                );
            if (entrySource) {
                description.append(
                    entrySource,
                );
            }
            if (entry.detail) {
                const detail =
                    documentRef.createElement(
                        'small',
                    );
                detail.textContent =
                    entry.detail;
                description.append(
                    detail,
                );
            }
            field.append(
                term,
                description,
            );
            fields.append(field);
        }
        section.append(
            groupHeader,
            fields,
        );
        grid.append(section);
    }

    dossier.append(
        header,
        grid,
    );
    return dossier;
}

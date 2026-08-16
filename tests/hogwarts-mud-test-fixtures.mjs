import {
    createDefaultCharacterDraft,
} from '../public/scripts/extensions/hogwarts-mud/domain/character.js';
import {
    createDefaultCampaign,
} from '../public/scripts/extensions/hogwarts-mud/domain/campaign.js';
import {
    applyOpeningWorldPackage,
    createInitialWorldState,
    validateOpeningWorldPackage,
} from '../public/scripts/extensions/hogwarts-mud/domain/initial-world.js';
import {
    normalizeActorCore,
    normalizeActorRuntime,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-context-schema.js';
import {
    normalizeNpcIdentity,
} from '../public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js';
import {
    addCurrentPlayerRelationship,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-actor-fixtures.mjs';

export {
    addCurrentPlayerRelationship,
    normalizeCurrentActorFixtureInPlace,
} from './hogwarts-mud-actor-fixtures.mjs';

export function createCurrentCharacter() {
    const character =
        createDefaultCharacterDraft();
    character.identity.name =
        'Tina Zhang';
    character.identity.birthDate =
        '1980-07-01';
    return character;
}

export function createCurrentActorProposal(
    id,
    {
        nameEn = '',
        roleEn =
        'Opening witness',
        present = true,
        roomId = 'kitchen',
        relationship =
        'Known adult',
        firstImpression =
        'A watchful child who studies every adult before speaking.',
    } = {},
) {
    const displayName =
        nameEn ||
        id
            .split('_')
            .map(part =>
                part
                    .slice(0, 1)
                    .toUpperCase() +
                part.slice(1))
            .join(' ');
    return {
        id,
        nameEn:
            displayName,
        aliases: [],
        roleEn,
        publicProfile: {
            descriptionEn:
                `${displayName} has a composed public manner and an alert expression.`,
            backgroundEn:
                `${displayName} has an established place in the current magical world.`,
        },
        performanceCore: {
            temperamentEn:
                'Observant, deliberate, and capable of withholding judgment.',
            speechStyleEn:
                'Precise sentences with restrained emotion.',
            motivesEn: [
                'Understand what the player intends.',
            ],
            socialStrategiesEn: [
                'Ask direct questions before acting.',
            ],
            boundariesEn: [
                'Will not tolerate coercion.',
            ],
            vulnerabilitiesEn: [
                'Protective of established responsibilities.',
            ],
        },
        privateFacts: {
            secretEn: '',
            knowledgeEn: [
                'A Hogwarts letter arrived at the house.',
            ],
        },
        runtime: {
            present,
            roomId:
                present
                    ? roomId
                    : '',
            currentActivityEn:
                present
                    ? 'Standing in the kitchen.'
                    : 'Waiting elsewhere.',
            currentIntentEn:
                present
                    ? 'Understand the letter.'
                    : '',
            currentGoalEn:
                'Resolve the interruption without losing control.',
        },
        initialRelationshipToPlayerEn:
            relationship,
        firstImpressionOfPlayerEn:
            present
                ? firstImpression
                : '',
    };
}

export function createCurrentMap() {
    return {
        id: 'zhang_home',
        nameEn: 'Zhang Home',
        currentLevelId:
            'ground_floor',
        levels: [{
            id: 'ground_floor',
            nameEn:
                'Ground Floor',
            z: 0,
        }],
        rooms: [
            {
                id: 'kitchen',
                nameEn:
                    'Kitchen',
                levelId:
                    'ground_floor',
                kind: 'room',
                descriptionEn:
                    'A kitchen window overlooks the back garden.',
                x: 30,
                y: 50,
                access: 'private',
            },
            {
                id: 'back_garden',
                nameEn:
                    'Back Garden',
                levelId:
                    'ground_floor',
                kind: 'garden',
                descriptionEn:
                    'A walled garden lies beyond the kitchen door.',
                x: 70,
                y: 50,
                access: 'private',
            },
        ],
        exits: [{
            from: 'kitchen',
            to: 'back_garden',
            direction: 'east',
            kind: 'door',
            minutes: 1,
        }],
        currentRoomId:
            'kitchen',
    };
}

export function createCurrentScene() {
    return {
        id: 'zhang_home_kitchen',
        nameEn:
            'Zhang Home Kitchen',
        summaryEn:
            'The enrollment discussion is nearly complete.',
        explorationHookEn:
            'One patch of garden grass remains dry beneath the waiting owl.',
        worldAnchorId: '',
        map:
            createCurrentMap(),
    };
}

function createCurrentStoryArc() {
    return {
        id: 'serpent_lineage',
        titleEn:
            'The Serpent Lineage',
        hookEn:
            'Tina can speak to snakes without knowing why.',
        hiddenTruthEn:
            'A concealed family branch reaches Tina through her mother.',
        stakesEn:
            'Several factions would exploit or erase the proof.',
        involvedActorIds: [
            'tina_mother',
            'minerva_mcgonagall',
            'old_archivist',
        ],
        cluePlan: [
            {
                id: 'mother_portrait',
                labelEn:
                    'The Altered Portrait',
                hiddenFactEn:
                    'The portrait was magically edited.',
                playerFacingDiscoveryEn:
                    'A moving edge remains around the mother figure.',
                unlockConditionEn:
                    'Closely inspect the photograph.',
                sourceActorIds: [
                    'tina_mother',
                ],
                sourceLocationIds: [],
                sourceItemId: '',
            },
            {
                id: 'school_registry',
                labelEn:
                    'The Sealed Registry',
                hiddenFactEn:
                    'A false surname was entered in the registry.',
                playerFacingDiscoveryEn:
                    'One line uses different ink and handwriting.',
                unlockConditionEn:
                    'Gain access to the sealed registry.',
                sourceActorIds: [
                    'minerva_mcgonagall',
                ],
                sourceLocationIds: [],
                sourceItemId: '',
            },
            {
                id: 'archivist_testimony',
                labelEn:
                    'The Archivist Testimony',
                hiddenFactEn:
                    'The archivist witnessed the concealment.',
                playerFacingDiscoveryEn:
                    'The archivist recognizes Tina by her eyes.',
                unlockConditionEn:
                    'Earn the archivist trust.',
                sourceActorIds: [
                    'old_archivist',
                ],
                sourceLocationIds: [],
                sourceItemId: '',
            },
        ],
    };
}

export function createCurrentOpeningPackage() {
    return {
        version: 1,
        chapterEn:
            'The Letter at Breakfast',
        clock:
            '1991-07-24 · 11:15',
        scene:
            createCurrentScene(),
        actorProposals: [
            createCurrentActorProposal(
                'tina_mother',
                {
                    nameEn:
                        'Mei Zhang',
                    roleEn:
                        'Tina\'s mother',
                    relationship:
                        'Mother and established guardian',
                },
            ),
            createCurrentActorProposal(
                'minerva_mcgonagall',
                {
                    nameEn:
                        'Minerva McGonagall',
                    roleEn:
                        'Deputy Headmistress',
                    relationship:
                        'Newly met school authority',
                },
            ),
            createCurrentActorProposal(
                'old_archivist',
                {
                    nameEn:
                        'Miriam Strout',
                    roleEn:
                        'Retired magical archivist',
                    present: false,
                    relationship:
                        'Unmet historical contact',
                },
            ),
        ],
        storyArc:
            createCurrentStoryArc(),
        conflict: {
            titleEn:
                'The Letter at Breakfast',
            premiseEn:
                'A Hogwarts letter has interrupted the household.',
            immediatePressureEn:
                'The reply must be settled before the owl leaves.',
            stakesEn:
                'Ignoring the letter will not stop the magical world.',
            incitingEventEn:
                'McGonagall placed the enrollment papers on the kitchen table.',
        },
        clues: [],
        items: [],
        nextSceneIntent: {
            titleEn:
                'The Owl in the Back Garden',
            summaryEn:
                'Return the signed reply to the waiting owl.',
            triggerEn:
                'After the enrollment discussion ends.',
            mapId: 'zhang_home',
            roomId:
                'back_garden',
            tier: 'medium',
        },
        openingBriefEn:
            'Begin with the signed reply on the table while both adults act independently and leave the player free to respond.',
    };
}

function currentIdentity(
    actorId,
) {
    const identities = {
        tina_mother: {
            gender: {
                code: 'female',
                label: '',
            },
            birth: {
                year: 1955,
                precision: 'year',
            },
        },
        minerva_mcgonagall: {
            gender: {
                code: 'female',
                label: '',
            },
            birth: {
                date:
                    '1935-10-04',
                precision: 'exact',
            },
        },
        old_archivist: {
            gender: {
                code: 'female',
                label: '',
            },
            birth: {
                date:
                    '1930-03-12',
                precision: 'exact',
            },
        },
    };
    return normalizeNpcIdentity(
        identities[actorId] ||
        {},
    );
}

export function createCurrentPlayingState() {
    const character =
        createCurrentCharacter();
    const world =
        createInitialWorldState(
            character,
            {},
            createDefaultCampaign(),
        );
    const opening =
        createCurrentOpeningPackage();
    const validation =
        validateOpeningWorldPackage(
            opening,
            world.character,
            world.campaign,
        );
    if (!validation.valid) {
        throw new TypeError(
            validation.errors.join(
                ' ',
            ),
        );
    }
    const state =
        applyOpeningWorldPackage(
            world,
            opening,
        );
    state.phase = 'playing';
    state.chapterEn =
        opening.chapterEn;
    state.actorLibrary =
        state.actorLibrary.map(
            actor => ({
                ...actor,
                identity:
                    currentIdentity(
                        actor.id,
                    ),
            }),
        );
    state.activeInteractionActorIds =
        state.actors
            .filter(actor =>
                actor.present)
            .map(actor =>
                actor.id);
    state.localPresence = {
        version: 1,
        mapId:
            state.map.activeMapId,
        roomId:
            state.map
                .currentLocalNodeId,
        occupantActorIds:
            [...state
                .activeInteractionActorIds],
        cohortIds: [],
        updatedTurn:
            state.turn.count,
        source:
            'scene_transition',
    };
    state.scene.nextSceneIntent =
        structuredClone(
            opening.nextSceneIntent,
        );
    return state;
}

export function createCurrentTransitionPackage(
    roomId = 'back_garden',
) {
    return {
        transitionMinutes: 0,
        nextClock:
            '1991-07-24 · 11:15',
        closureSummaryEn:
            'The enrollment form is signed and Tina leaves the kitchen.',
        globalChronicleSummaryEn:
            'The kitchen enrollment scene ended after the required paperwork was signed and the immediate household dispute settled. Tina left the table for the garden while the adults retained their established responsibilities, and no hidden fact or private interpretation displaced the public sequence of events.',
        authorQuillEn:
            'The editorial desk awards the household a modest prize for completing the enrollment paperwork without turning the kitchen table into a permanent administrative monument. The owl remained the calmest participant, McGonagall preserved professional dignity, and Tina discovered that signing a form is less dramatic than arguing with it but considerably more effective. The scene closes with the reply ready, the garden accessible, and every remaining choice left to the player.',
        unresolvedThreadsEn: [
            'The owl still carries an unfamiliar leather tag.',
        ],
        nextScene: {
            id:
                'zhang_home_garden_owl',
            nameEn:
                'The Owl in the Back Garden',
            summaryEn:
                'Tina reaches the garden while the adults finish the paperwork inside.',
            explorationHookEn:
                'One patch of dew remains dry beneath the fence and may be examined or ignored.',
            temporalFactsEn: [],
            chapterEn:
                'The Letter at Breakfast',
            mapId: 'zhang_home',
            roomId,
            actorStates: [{
                id:
                    'minerva_mcgonagall',
                present: true,
                currentActivityEn:
                    'Standing at the garden door with the reply slip.',
                currentIntentEn:
                    '',
                lifeStatus: 'alive',
                lifeStatusPermanent:
                    false,
                lifeStatusDetailEn:
                    'Alive and unharmed.',
                mapId:
                    'zhang_home',
                roomId:
                    'kitchen',
            }],
            openingSegments: [
                {
                    type:
                        'narration',
                    textEn:
                        'The garden door opens onto wet grass while the owl waits by the fence.',
                },
                {
                    type:
                        'dialogue',
                    actorId:
                        'minerva_mcgonagall',
                    textEn:
                        'The owl will wait, Miss Zhang, but not indefinitely.',
                },
            ],
            followingSceneIntent: {
                titleEn:
                    'The Signed Reply',
                summaryEn:
                    'Return the signed reply to the waiting owl.',
                triggerEn:
                    'After Tina decides whether to inspect the owl.',
                mapId:
                    'zhang_home',
                roomId:
                    'back_garden',
                tier: 'medium',
            },
        },
    };
}

export function createCurrentKingsCrossState(
    roomId =
    'platform_barrier',
) {
    const state =
        createCurrentPlayingState();
    const minerva =
        state.actorLibrary.find(
            actor =>
                actor.id ===
                'minerva_mcgonagall',
        );
    state.actorLibrary = [
        normalizeActorCore(
            {
                ...structuredClone(
                    minerva,
                ),
                id: 'alex_zhang',
                canonCatalogId: '',
                nameEn:
                    'Alex Zhang',
                roleEn:
                    'Tina\'s father',
                cast: {
                    origin:
                        'foundation',
                    introducedClock:
                        state.clock,
                    introducedTurn:
                        state.turn.count,
                },
                identity: {
                    ...structuredClone(
                        minerva.identity,
                    ),
                    gender: {
                        code: 'male',
                        label: '',
                    },
                },
            },
        ),
        minerva,
    ];
    state.actors =
        state.actorLibrary.map(
            actor =>
                normalizeActorRuntime({
                    id: actor.id,
                    mapId:
                        'kings_cross',
                    roomId,
                    present: true,
                    lifeStatus:
                        'alive',
                    lifeStatusPermanent:
                        false,
                    lifeStatusDetailEn:
                        'Alive.',
                    lifeStatusSinceClock:
                        '',
                    currentActivityEn:
                        'Waiting with Tina near the station barrier.',
                    currentIntentEn:
                        '',
                    currentGoalEn:
                        '',
                    temporary: false,
                }),
        );
    state.map.activeMapId =
        'kings_cross';
    state.map.currentLocalNodeId =
        roomId;
    state.map.currentLevelId =
        'station';
    state.scene.mapId =
        'kings_cross';
    state.scene.roomId =
        roomId;
    state.scene.nameEn =
        'The Barrier Between Platforms Nine and Ten';
    state.spatial = {
        version: 7,
        player: {
            mapId:
                'kings_cross',
            roomId,
        },
        lastMovement: null,
    };
    state.items = [{
        id:
            'acceptance_letter',
        labelEn:
            'Hogwarts acceptance letter',
        label:
            '霍格沃茨录取通知书',
        importance: 'key',
        custody: 'carried',
        ownerId: 'player',
        mapId:
            'kings_cross',
        roomId,
        status: 'available',
    }];
    addCurrentPlayerRelationship(
        state,
        'alex_zhang',
        ['parent'],
    );
    return normalizeCurrentActorFixtureInPlace(
        state,
    );
}

import {
    SPELL_STATIC_LOCALE_EN,
} from '../spell-catalog.js';
import {
    MAP_STATIC_LOCALE_EN,
} from '../map-pack.js';
import {
    WORLD_MAP_STATIC_LOCALE_EN,
} from '../world-data.js';
import {
    UI_STATIC_LOCALE_EN,
} from './ui-static.js';

export const STATIC_LOCALE_RESOURCE_VERSION = 1;

export const EN_STATIC_LOCALE = Object.freeze({
    ...MAP_STATIC_LOCALE_EN,
    ...SPELL_STATIC_LOCALE_EN,
    ...UI_STATIC_LOCALE_EN,
    ...WORLD_MAP_STATIC_LOCALE_EN,
    'campaign.canon_1991.name':
        'Harry\'s Cohort',
    'campaign.canon_1991.eyebrow':
        'Canon Cohort',
    'campaign.canon_1991.description':
        'Receive a Hogwarts letter in 1991 as established Canon characters and events begin from their known conditions.',
    'campaign.hogwarts_student.name':
        'Hogwarts Student',
    'campaign.hogwarts_student.eyebrow':
        'Open School Years',
    'campaign.hogwarts_student.description':
        'Enter Hogwarts in any school year with prior classes, relationships, and abilities recorded in the character background.',
    'campaign.marauders_era.name':
        'Marauders Era',
    'campaign.marauders_era.eyebrow':
        'Earlier Generation',
    'campaign.marauders_era.description':
        'Begin at Hogwarts in 1971, before the shadow of war settles into established causality.',
    'difficulty.narrative.name':
        'Narrative',
    'difficulty.narrative.description':
        'Consequences remain binding, but danger escalates more slowly and failure more often opens a new plot.',
    'difficulty.standard.name':
        'Standard',
    'difficulty.standard.description':
        'Resolve risks, broken relationships, discipline, and injuries under the complete rules.',
    'difficulty.harsh.name':
        'Harsh',
    'difficulty.harsh.description':
        'Resources are scarce, opponents act earlier, and permanent injury or death enters play sooner.',
    'attribute.physique':
        'Physique',
    'attribute.agility':
        'Agility',
    'attribute.perception':
        'Perception',
    'attribute.intellect':
        'Intellect',
    'attribute.willpower':
        'Willpower',
    'attribute.charisma':
        'Charisma',
    'check.rule.physical_force':
        'Physical contest',
    'check.rule.agility':
        'Agility action',
    'check.rule.perception':
        'Perception check',
    'check.rule.intellect':
        'Intellect check',
    'check.rule.willpower':
        'Willpower check',
    'check.rule.charisma':
        'Social contest',
    'check.rule.magic':
        'Spellcasting check',
    'check.rule.forced_general':
        'General check',
    'check.target.opposed':
        'Opposed',
    'check.target.hidden':
        'hidden difficulty',
    'check.target.environment':
        'Hidden environment difficulty',
    'check.total':
        'Total',
    'check.outcome.catastrophic_failure':
        'Catastrophic failure',
    'check.outcome.failure':
        'Failure with consequence',
    'check.outcome.success_with_cost':
        'Success at a cost',
    'check.outcome.success':
        'Full success',
    'check.outcome.critical_success':
        'Critical success',
    'item.state.intact':
        'Intact',
    'item.state.damaged':
        'Damaged',
    'item.state.destroyed':
        'Destroyed',
    'item.physical_form.whole':
        'Whole',
    'item.physical_form.remains':
        'Remains',
    'item.physical_form.absent':
        'Absent',
    'actor.life_status.alive':
        'Alive',
    'actor.life_status.injured':
        'Injured',
    'actor.life_status.incapacitated':
        'Incapacitated',
    'actor.life_status.missing':
        'Missing',
    'actor.life_status.dead':
        'Dead',
    'map.status.world_setup':
        'World setup in progress',
    'map.location.unknown':
        'Unknown location',
    'story.chapter.opening_world':
        'Opening World',
    'spell.source.initial':
        'Initial knowledge',
    'spell.source.classroom':
        'Classroom',
    'spell.source.observation':
        'Observation',
    'spell.source.explanation':
        'Explanation',
    'spell.source.experiment':
        'Experiment',
    'spell.source.custom':
        'Custom',
    'translation.status.pending':
        'Translating',
    'translation.status.error':
        'Translation unavailable',
    'translation.status.partial_error':
        'Some fields are showing English source',
    'translation.action.retranslate':
        'Retranslate',
    'display_locale.zh-CN':
        'Chinese',
    'display_locale.en':
        'English',
});

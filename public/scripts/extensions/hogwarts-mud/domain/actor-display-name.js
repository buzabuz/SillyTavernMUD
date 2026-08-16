import {
    getCanonLocalizationZhCn,
} from '../canon-localization.zh-cn.js';

export function createActorNameField(
    actorId,
    nameEn,
) {
    return {
        recordKind: 'actor_core',
        recordId:
            String(actorId || ''),
        fieldPath: 'nameEn',
        sourceTextEn:
            String(
                nameEn ||
                actorId ||
                '',
            ),
    };
}

export function createActorRoleField(
    actorId,
    roleEn,
) {
    return {
        recordKind:
            'actor_core',
        recordId:
            String(actorId || ''),
        fieldPath: 'roleEn',
        sourceTextEn:
            String(
                roleEn ||
                '',
            ),
    };
}

export function createActorRuntimeField(
    actorId,
    fieldPath,
    sourceTextEn,
) {
    return {
        recordKind:
            'actor_runtime',
        recordId:
            String(actorId || ''),
        fieldPath:
            String(
                fieldPath ||
                '',
            ),
        sourceTextEn:
            String(
                sourceTextEn ||
                '',
            ),
    };
}

export function getActorDisplayName({
    actorId,
    nameEn,
    displayLocale,
    getLocalizedField,
}) {
    const sourceName =
        String(
            nameEn ||
            actorId ||
            '',
        );
    if (
        displayLocale === 'zh-CN'
    ) {
        const canonical =
            getCanonLocalizationZhCn(
                actorId,
            );
        if (canonical?.nameZh) {
            return canonical.nameZh;
        }
    }
    return getLocalizedField(
        createActorNameField(
            actorId,
            sourceName,
        ),
    )?.text ||
        sourceName;
}

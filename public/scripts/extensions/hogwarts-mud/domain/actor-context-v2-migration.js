export function isActorContextV1LocationUpgradeSource(
    source,
    actorDossierProjectionVersion,
) {
    return (
        source?.actorContextVersion === 1 &&
        source
            .actorDossierProjectionVersion ===
            actorDossierProjectionVersion &&
        Array.isArray(
            source.actorLibrary,
        ) &&
        Array.isArray(
            source.actors,
        ) &&
        Boolean(
            source.actorMemoryIndex,
        )
    );
}

export function upgradeActorContextV1Location(
    source,
    actorContextVersion,
) {
    const next =
        structuredClone(
            source,
        );
    next.actorContextVersion =
        actorContextVersion;
    next.actors =
        next.actors.map(actor => {
            if (
                Object.hasOwn(
                    actor,
                    'locationKnown',
                )
            ) {
                throw new TypeError(
                    'Actor Context V1 runtime unexpectedly contains locationKnown.',
                );
            }
            const locationKnown =
                Boolean(
                    actor.mapId &&
                    actor.roomId,
                );
            return {
                ...actor,
                mapId:
                    locationKnown
                        ? actor.mapId
                        : '',
                roomId:
                    locationKnown
                        ? actor.roomId
                        : '',
                locationKnown,
                present:
                    locationKnown &&
                    actor.present ===
                        true,
            };
        });
    return next;
}

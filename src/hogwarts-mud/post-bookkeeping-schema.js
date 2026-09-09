import { z } from 'zod';
import {
    POST_BOOKKEEPING_PROPERTIES,
} from '../../public/scripts/extensions/hogwarts-mud/domain/post-bookkeeping-contract.js';

/** Field routes: vcon013.result.temporaryActors/firstImpressions/sceneProgression/pacingRealization/historicalClaims. */
function bookkeepingSchema(descriptor) {
    if (descriptor.anyOf) return z.union(descriptor.anyOf.map(bookkeepingSchema));
    if (descriptor.enum) return z.enum(descriptor.enum);
    switch (descriptor.type) {
        case 'null': return z.null();
        case 'boolean': return z.boolean();
        case 'integer': return z.number().int().min(descriptor.minimum ?? 0);
        case 'string': return z.string().max(descriptor.maxLength);
        case 'array': return z.array(bookkeepingSchema(descriptor.items)).max(descriptor.maxItems);
        case 'object': return z.object(Object.fromEntries(
            Object.entries(descriptor.properties).map(([key, value]) => [key, bookkeepingSchema(value)]),
        )).strip();
        default: throw new TypeError('Unsupported Post bookkeeping descriptor.');
    }
}

export const postBookkeepingSchemas = Object.fromEntries(
    Object.entries(POST_BOOKKEEPING_PROPERTIES).map(([key, value]) => [key, bookkeepingSchema(value)]),
);

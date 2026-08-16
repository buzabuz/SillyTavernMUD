import {
    EN_STATIC_LOCALE,
    STATIC_LOCALE_RESOURCE_VERSION,
} from '../locales/en.js';
import {
    ZH_CN_STATIC_LOCALE,
} from '../locales/zh-cn.js';

export const LOCALIZED_VIEW_MODEL_VERSION = 1;
export const DISPLAY_LOCALES =
    Object.freeze([
        'zh-CN',
        'en',
    ]);

const STATIC_RESOURCES =
    Object.freeze({
        en: EN_STATIC_LOCALE,
        'zh-CN':
            ZH_CN_STATIC_LOCALE,
    });

export function normalizeDisplayLocale(
    value,
) {
    return DISPLAY_LOCALES
        .includes(value)
        ? value
        : 'zh-CN';
}

export function getStaticLocaleText(
    key,
    displayLocale = 'zh-CN',
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
    return String(
        STATIC_RESOURCES[locale]
            ?.[key] ||
        STATIC_RESOURCES.en[key] ||
        '',
    );
}

function translationRowMap(
    translationRows,
) {
    if (
        translationRows instanceof
        Map
    ) {
        return translationRows;
    }
    if (
        translationRows &&
        typeof translationRows ===
            'object' &&
        !Array.isArray(
            translationRows,
        )
    ) {
        return new Map(
            Object.entries(
                translationRows,
            ),
        );
    }
    return new Map(
        (
            Array.isArray(
                translationRows,
            )
                ? translationRows
                : []
        ).map(entry => [
            entry?.key,
            entry?.row ||
                entry,
        ]),
    );
}

function projectLocalizedField(
    field,
    {
        displayLocale,
        rows,
    },
) {
    const sourceTextEn =
        String(
            field?.sourceTextEn ||
            '',
        );
    const rawText =
        String(
            field?.rawText ||
            '',
        );
    if (rawText) {
        return {
            fieldPath:
                String(
                    field?.fieldPath ||
                    '',
                ),
            displayText: rawText,
            sourceTextEn: '',
            status: 'raw_evidence',
            errorCode: '',
        };
    }
    if (displayLocale === 'en') {
        const staticText =
            getStaticLocaleText(
                field?.staticKey,
                'en',
            );
        return {
            fieldPath:
                String(
                    field?.fieldPath ||
                    '',
                ),
            displayText:
                staticText ||
                sourceTextEn,
            sourceTextEn,
            status:
                staticText
                    ? 'static'
                    : 'source',
            errorCode: '',
        };
    }
    const staticText =
        getStaticLocaleText(
            field?.staticKey,
            displayLocale,
        );
    if (staticText) {
        return {
            fieldPath:
                String(
                    field?.fieldPath ||
                    '',
                ),
            displayText:
                staticText,
            sourceTextEn,
            status: 'static',
            errorCode: '',
        };
    }
    const row =
        rows.get(
            field?.translationKey,
        );
    if (
        row?.status === 'ready' &&
        row.targetLocale ===
            displayLocale &&
        String(
            row.translatedText ||
            '',
        ).trim()
    ) {
        return {
            fieldPath:
                String(
                    field?.fieldPath ||
                    '',
                ),
            displayText:
                String(
                    row.translatedText,
                ),
            sourceTextEn,
            status: 'translated',
            errorCode: '',
        };
    }
    return {
        fieldPath:
            String(
                field?.fieldPath ||
                '',
            ),
        displayText:
            sourceTextEn,
        sourceTextEn,
        status:
            row?.status === 'error'
                ? 'error'
                : 'pending',
        errorCode:
            String(
                row?.errorCode ||
                '',
            ).slice(0, 64),
    };
}

export function createLocalizedViewModel(
    canonical,
    {
        displayLocale = 'zh-CN',
        translationRows = [],
    } = {},
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
    const rows =
        translationRowMap(
            translationRows,
        );
    return {
        schemaVersion:
            LOCALIZED_VIEW_MODEL_VERSION,
        staticResourceVersion:
            STATIC_LOCALE_RESOURCE_VERSION,
        displayLocale: locale,
        recordKind:
            String(
                canonical?.recordKind ||
                '',
            ),
        recordId:
            String(
                canonical?.recordId ||
                '',
            ),
        fields: (
            Array.isArray(
                canonical?.fields,
            )
                ? canonical.fields
                : []
        ).map(field =>
            projectLocalizedField(
                field,
                {
                    displayLocale:
                        locale,
                    rows,
                },
            )),
    };
}

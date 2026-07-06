/**
 * THE translation lookup. One mechanism for every dictionary in the app.
 *
 * Where translations live (by design, not by accident):
 *  - src/lib/i18n.ts       — global UI strings, SPECTRUM, language registry
 *  - src/components/…      — strings owned by a shared component (e.g. NetworkTruth)
 *  - src/app/<page>        — strings owned by exactly one page (local TX dict)
 *  - src/data/…            — content (questions, agenda) with per-language fields
 *
 * Every dictionary maps  key → { langCode → text }  and resolves through
 * makeTx: requested language, then English, then the key itself.
 */

export type LangRecord = Record<string, string>;

export function makeTx<T extends Record<string, LangRecord>>(dict: T) {
  return (lang: string, key: keyof T & string): string =>
    dict[key]?.[lang] ?? dict[key]?.['en'] ?? key;
}

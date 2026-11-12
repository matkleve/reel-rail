import { DE_DIALOGS } from "./deDialogs";
import { DE_MESSAGES } from "./deMessages";
import { DE_UI } from "./deUi";

/**
 * German, keyed by the English source text. Informal "du", short — most of it
 * is read on a phone. i18n.test.ts checks that every t() key is here, that
 * nothing here is unused, and that placeholders match.
 */
export const DE: Readonly<Record<string, string>> = { ...DE_UI, ...DE_DIALOGS, ...DE_MESSAGES };

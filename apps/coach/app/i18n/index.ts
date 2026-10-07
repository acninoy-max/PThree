import type { Locale } from "./locale";
import { de, type Dict } from "./de";
import { en } from "./en";

export type { Dict };

const DICTS: Record<Locale, Dict> = { de, en };

export function dictFor(locale: Locale): Dict {
  return DICTS[locale];
}

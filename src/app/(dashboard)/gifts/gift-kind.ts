// What a gift is, derived from its `item_key` (mirrors nextjs-sample/lib/items.ts):
//   null       → a plain gift
//   outfit_*   → a game character outfit; the gift's image is the sprite
//   anything else (trail_*, theme_*, extra_life) → built-in game items, whose
//   look lives in the app's code, so staff can edit them but not create them.
// Staff only ever pick "gift" or "outfit"; the key itself is generated.
export type GiftKind = 'gift' | 'outfit' | 'system';

export const OUTFIT_PREFIX = 'outfit_';

export function giftKind(itemKey: string | null | undefined): GiftKind {
  if (!itemKey) return 'gift';
  return itemKey.startsWith(OUTFIT_PREFIX) ? 'outfit' : 'system';
}

export const GIFT_KIND_LABEL: Record<GiftKind, string> = {
  gift: 'Απλό δώρο',
  outfit: 'Ρούχο ήρωα (παιχνίδι)',
  system: 'Αντικείμενο παιχνιδιού',
};

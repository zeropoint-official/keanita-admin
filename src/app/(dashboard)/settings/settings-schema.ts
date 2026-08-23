/** Setting keys used by the app, with their JSON value type. */
export type SettingsMap = Record<string, unknown>;

export const str = (s: SettingsMap, k: string, d = '') => (typeof s[k] === 'string' ? (s[k] as string) : d);
export const num = (s: SettingsMap, k: string, d = 0) => (typeof s[k] === 'number' ? (s[k] as number) : d);
export const bool = (s: SettingsMap, k: string, d = false) => (typeof s[k] === 'boolean' ? (s[k] as boolean) : d);

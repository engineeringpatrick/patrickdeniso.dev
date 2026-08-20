const buffers = new Map<string, string>();

export const readVimBuffer = (key: string, fallback: string) => buffers.get(key) ?? fallback;
export const hasVimBuffer = (key: string) => buffers.has(key);
export const writeVimBuffer = (key: string, value: string) => buffers.set(key, value);

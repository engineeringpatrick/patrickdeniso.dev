import type { V4Language } from '../../locales/v4';

export const V4_LANGUAGE_CHANGE_EVENT = 'v4:language-change';
export const V4_LANGUAGE_REQUEST_EVENT = 'v4:language-request';
export const V4_ROOM_CHANGE_EVENT = 'v4:room-change';
export const V4_CONSOLE_CLOSE_EVENT = 'v4:console-close';

export type V4LanguageRequestDetail = { language: V4Language };
export type V4RoomChangeDetail = { open: boolean };

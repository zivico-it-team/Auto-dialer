/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin plus /api, e.g. https://talkingwave.tech/api */
  readonly VITE_API_BASE_URL?: string;
  /** Socket.IO origin, e.g. https://talkingwave.tech */
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

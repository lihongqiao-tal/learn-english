/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_TAL_MLOPS_APP_ID: string;
  readonly VITE_TAL_MLOPS_APP_KEY: string;
  // 在这里添加更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


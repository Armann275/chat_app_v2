const REQUIRED = ['VITE_API_BASE_URL', 'VITE_SOCKET_URL'];

const missing = REQUIRED.filter(
  (k) => !import.meta.env[k] || String(import.meta.env[k]).trim() === '',
);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

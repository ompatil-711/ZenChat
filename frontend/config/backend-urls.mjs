/**
 * @param {string | undefined} value
 * @param {string} name
 * @param {boolean} production
 */
function backendUrl(value, name, production) {
  if (!value?.trim()) throw new Error(`${name} is required. Configure it before starting or building the frontend.`);

  let url;
  try { url = new URL(value.trim()); }
  catch { throw new Error(`${name} must be an absolute HTTP(S) backend URL.`); }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) backend URL without credentials, query parameters, or a fragment.`);
  }

  if (production) {
    const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
    const local = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      /^(?:0|10|127)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) || host === "::" || host === "::1" ||
      /^(?:f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:|::ffff:)/.test(host);
    if (local || url.protocol !== "https:") {
      throw new Error(`${name} must use a public HTTPS backend in production. Local addresses are only allowed in development.`);
    }
  }

  return url.toString().replace(/\/+$/, "");
}

/**
 * These URLs are public browser configuration, never service credentials.
 * @param {{ userUrl?: string | undefined, chatUrl?: string | undefined, production: boolean }} config
 */
export function resolveBackendUrls(config) {
  return {
    user: backendUrl(config.userUrl, "NEXT_PUBLIC_USER_BACKEND_URL", config.production),
    chat: backendUrl(config.chatUrl, "NEXT_PUBLIC_CHAT_BACKEND_URL", config.production),
  };
}

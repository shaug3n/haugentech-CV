import { getRequestConfig } from "next-intl/server";

// Minimal placeholder request config so the next-intl plugin (wired up in
// next.config.ts) can build. Task 4 replaces this with real locale routing
// (messages, locale detection, etc.) when the locale layout is introduced.
export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages: {},
  };
});

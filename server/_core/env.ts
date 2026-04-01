export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authPassword: process.env.AUTH_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /**
   * Prefer OPENAI_* variables, but accept OPENAPI_* aliases because this
   * typo is common in provider dashboards and deployment UIs.
   */
  openaiApiUrl: process.env.OPENAI_API_URL ?? process.env.OPENAPI_API_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.OPENAPI_API_KEY ?? "",
  // Aliases used by core proxy modules (dataApi, imageGeneration, map, storage, etc.)
  get forgeApiUrl() { return this.openaiApiUrl; },
  get forgeApiKey() { return this.openaiApiKey; },
};

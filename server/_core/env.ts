export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authPassword: process.env.AUTH_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openaiApiUrl: process.env.OPENAI_API_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Aliases used by core proxy modules (dataApi, imageGeneration, map, storage, etc.)
  get forgeApiUrl() { return this.openaiApiUrl; },
  get forgeApiKey() { return this.openaiApiKey; },
};

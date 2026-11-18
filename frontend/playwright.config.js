import { defineConfig, devices } from "@playwright/test";

// Smoke tests against the real app: the API on a throwaway, freshly seeded database plus the Vite dev server.
// The database name must contain "e2e" or "test" (the seed wipes it); see e2e/global-setup.js.
export const MONGO_URI = process.env.E2E_MONGO_URI || "mongodb://127.0.0.1:27017/teampulse_e2e";

// Blank values keep backend/.env from supplying real credentials: Redis, uploads and AI stay off.
const apiEnv = {
    MONGO_URI,
    NODE_ENV: "development",
    PORT: "5001",
    JWT_SECRET: "e2e-only-secret",
    CLIENT_URL: "http://localhost:5173",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    CLOUDINARY_CLOUD_NAME: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
    GEMINI_API_KEY: "",
    GOOGLE_GEMINI_API_KEY: "",
};

export default defineConfig({
    testDir: "./e2e",
    globalSetup: "./e2e/global-setup.js",
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://localhost:5173",
        trace: "retain-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile/ },
        { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, testMatch: /mobile/ },
    ],
    webServer: [
        { command: "node server.js", cwd: "../backend", env: apiEnv, url: "http://localhost:5001/api/health", reuseExistingServer: !process.env.CI, timeout: 60_000 },
        { command: "npm run dev -- --port 5173 --strictPort", url: "http://localhost:5173", reuseExistingServer: !process.env.CI, timeout: 60_000 },
    ],
});

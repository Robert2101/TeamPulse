import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MONGO_URI } from "../playwright.config.js";

// Seeds the demo workspace before every run. seed.js wipes the database, so refuse anything
// that doesn't look like a throwaway test database.
export default function globalSetup() {
    const dbName = new URL(MONGO_URI).pathname.slice(1);
    if (!/e2e|test/i.test(dbName)) {
        throw new Error(`Refusing to seed "${dbName}": E2E_MONGO_URI must name a database containing "e2e" or "test".`);
    }
    execFileSync("node", ["seed.js"], {
        cwd: fileURLToPath(new URL("../../backend", import.meta.url)),
        env: { ...process.env, MONGO_URI },
        stdio: "ignore",
    });
}

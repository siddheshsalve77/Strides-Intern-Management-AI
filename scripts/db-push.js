// Deployment artifact guard: ensures the packaged SQLite database file exists
// at the path given by DATABASE_URL (e.g. "file:/tmp/build_fullstack_X/db/custom.db").
//
// WHY THIS EXISTS:
// The Z.ai platform's .zscripts/database-runtime-build.sh runs `bun run db:push`
// during EVERY platform deploy (with set -euo pipefail), and .zscripts/start.sh
// hard-fails the deployment if the packaged /app/db/custom.db is missing.
// This project migrated from Prisma/SQLite to Firebase (Firestore) — no code
// reads this database — but the platform pipeline still requires the artifact.
//
// This script creates (or verifies) a valid, minimal SQLite database file so
// the platform build and runtime checks pass. It is intentionally a no-op for
// the application itself.

const { Database } = require("bun:sqlite");
const fs = require("fs");
const path = require("path");

const url = process.env.DATABASE_URL || "file:db/custom.db";
const dbPath = url.startsWith("file:") ? url.slice("file:".length) : url;

if (!dbPath || dbPath === "/" ) {
  console.error("[db:push] Refusing to operate on empty/root path:", url);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const existed = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0;
const db = new Database(dbPath); // creates the file if missing
// bun:sqlite creates the file lazily (0 bytes until a write happens).
// Materialize a real, valid SQLite file with a schema so any consumer
// (platform checks, future tooling) sees a proper database.
db.exec(
  "CREATE TABLE IF NOT EXISTS _platform_meta (key TEXT PRIMARY KEY, value TEXT)"
);
db.exec(
  "INSERT OR REPLACE INTO _platform_meta (key, value) VALUES ('schema_version', '1')"
);
db.close();

console.log(
  `[db:push] ${existed ? "verified existing" : "created"} SQLite database at ${dbPath}`
);

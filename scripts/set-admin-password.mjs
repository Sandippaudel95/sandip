/* Change the admin panel password.
 *
 *   node scripts/set-admin-password.mjs
 *
 * You type the password into your own terminal; it is never printed, never
 * logged, and never stored in plain text. Only the bcrypt hash is written.
 *
 * It updates .env.local for local development and puts the hash on your
 * clipboard for pasting into Vercel. Those are two separate stores, and
 * Vercel needs a deploy before the change reaches the live site.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV = path.join(ROOT, ".env.local");
const MIN = 12;

/* Queued when stdin is not a terminal, so the script can be exercised by
   piping two lines into it. Interactively this stays empty. */
let piped = null;
function nextPipedLine() {
  if (piped === null) piped = fs.readFileSync(0, "utf8").split(/\r?\n/);
  return piped.shift() ?? "";
}

function ask(question, hidden) {
  if (!process.stdin.isTTY) {
    process.stdout.write(question + "\n");
    return Promise.resolve(nextPipedLine());
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (hidden) {
      // Suppress the echo so the password never reaches the screen or
      // terminal scrollback.
      rl._writeToOutput = function (s) {
        if (!rl.muted) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.muted = false;
      if (hidden) rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
    rl.muted = !!hidden;
  });
}

if (!fs.existsSync(ENV)) {
  console.error(`Cannot find ${ENV}`);
  process.exit(1);
}

const pw = await ask("New admin password: ", true);
if (pw.length < MIN) {
  console.error(`\nToo short: needs at least ${MIN} characters.`);
  process.exit(1);
}
if ((await ask("Type it again:      ", true)) !== pw) {
  console.error("\nThe two did not match. Nothing was changed.");
  process.exit(1);
}

const hash = bcrypt.hashSync(pw, 12);

let src = fs.readFileSync(ENV, "utf8");
// Every `$` escaped: Next expands them when reading .env files, which
// silently truncates an unescaped hash and makes every sign-in fail
// exactly as though the password were wrong.
src = src.replace(
  /^ADMIN_PASSWORD_HASH=.*$/m,
  `ADMIN_PASSWORD_HASH=${hash.replace(/\$/g, "\\$")}`,
);
// Drop any recorded plaintext: you chose this one, so you know it.
src = src.replace(/^#\s*(Admin|Dev) password:.*\r?\n/m, "");
fs.writeFileSync(ENV, src);

// Read it back the way the running app will, so a quoting mistake surfaces
// here rather than as a locked-out admin panel.
nextEnv.loadEnvConfig(ROOT, true, { info() {}, error() {} });
const seen = process.env.ADMIN_PASSWORD_HASH ?? "";
const ok = seen.length === 60 && bcrypt.compareSync(pw, seen);

console.log(`\n.env.local updated. App reads a ${seen.length}-char hash.`);
console.log(
  ok ? "Verified: the new password authenticates." : "WARNING: verification FAILED.",
);
if (!ok) process.exit(1);

try {
  execFileSync("powershell", ["-NoProfile", "-Command", "Set-Clipboard -Value $input"], {
    input: hash,
  });
  console.log("\nThe hash is on your clipboard (safe to paste; it is not the password).");
} catch {
  console.log(`\nHash for Vercel:\n${hash}`);
}

console.log(`
Next, so the live site uses it:
  1. Vercel -> Settings -> Environment Variables
  2. Edit ADMIN_PASSWORD_HASH in Production, Preview and Development
     and paste the hash into each (no quotes, no trailing space)
  3. Deploy:  npx vercel deploy --prod

Until you deploy, the live site keeps the previous password.
Sign in with: ${process.env.ADMIN_EMAIL ?? "(ADMIN_EMAIL not set)"}
`);

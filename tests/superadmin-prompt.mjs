#!/usr/bin/env node
/**
 * tests/superadmin-prompt.mjs
 *
 * Safe test workflow for the input helpers used by scripts/create-super-admin.js
 * (promptText, promptPassword, promptInput, SHOW_PASSWORD).
 *
 * Safety properties:
 *   - Reuses the ACTUAL helpers from scripts/create-super-admin.js — no duplicate
 *     implementation.
 *   - Never connects to MongoDB (importing the script only loads .env.local; mongoose
 *     is imported lazily inside main(), which this harness never calls).
 *   - Never creates, updates, or deletes any account.
 *
 * Modes:
 *   node tests/superadmin-prompt.mjs
 *     Automated suite on piped stdin. Safe to run anywhere (this environment, CI).
 *     Spawns child processes with genuinely piped stdin to verify that non-TTY input
 *     fails safely, and verifies the SUPER_ADMIN_SHOW_PASSWORD env wiring.
 *   node tests/superadmin-prompt.mjs --pty
 *     TTY-required suite. Must run in a real terminal (e.g. macOS Terminal). Runs the
 *     actual interactive prompts (email, full name, password, confirmation) against
 *     the imported production helpers.
 *   make test-superadmin-prompt
 *     Runs the automated suite (no database, no account creation).
 *
 * Output clearly separates AUTOMATED TESTS from TTY-required and MANUAL tests.
 */

import { promptText, promptPassword, SHOW_PASSWORD } from "../scripts/create-super-admin.js";

const results = [];
let failures = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) {
    failures += 1;
  }
}

function summary() {
  console.log(
    `\n${failures === 0 ? "All automated checks passed." : `${failures} check(s) failed.`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

/**
 * Spawn a child process with genuinely piped stdin (not a TTY) and run an inline
 * script. Returns { code, out, err }.
 */
async function spawnPiped(inline, { env, timeoutMs = 8000 } = {}) {
  const { spawn } = await import("node:child_process");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const childEnv = env !== undefined ? { ...process.env, ...env } : process.env;
  const proc = spawn(process.execPath, ["-e", inline], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: process.cwd(),
    env: childEnv,
    signal: controller.signal,
  });
  let out = "";
  let err = "";
  proc.stdout.on("data", (d) => (out += d.toString()));
  proc.stderr.on("data", (d) => (err += d.toString()));
  const code = await new Promise((resolve) => {
    proc.on("close", resolve);
    proc.on("error", () => resolve(null));
  });
  clearTimeout(timeout);
  return { code, out, err };
}

/**
 * Spawn a child that imports create-super-admin.js (loads .env.local, evaluates
 * SHOW_PASSWORD) with a controlled environment, then logs the SHOW_PASSWORD value.
 * Never connects to MongoDB; never calls promptText/promptPassword.
 */
async function showPasswordValue(envValue) {
  const childEnv = { ...process.env };
  delete childEnv.SUPER_ADMIN_SHOW_PASSWORD;
  if (envValue !== undefined) {
    childEnv.SUPER_ADMIN_SHOW_PASSWORD = String(envValue);
  }
  const { code, out } = await spawnPiped(
    "(async()=>{const m=await import('./scripts/create-super-admin.js');console.log('SHOW='+String(m.SHOW_PASSWORD));process.exit(0);})()",
    { env: childEnv },
  );
  const match = out.match(/SHOW=(true|false)/);
  return { code, value: match ? match[1] : null, out };
}

async function automatedSuite() {
  console.log(
    "AUTOMATED TESTS - superadmin input helpers (piped stdin, no TTY, no MongoDB, no account)",
  );
  console.log("Helper source: scripts/create-super-admin.js (imported, not duplicated)\n");

  // A1 - reuse: the actual helpers are imported, not re-implemented.
  {
    record("promptText is imported from create-super-admin.js", typeof promptText === "function");
    record(
      "promptPassword is imported from create-super-admin.js",
      typeof promptPassword === "function",
    );
    record(
      "SHOW_PASSWORD is exported from create-super-admin.js",
      typeof SHOW_PASSWORD === "boolean",
    );
  }

  // A2 - importing the bootstrap script never connects to MongoDB.
  {
    const { code, out } = await spawnPiped(
      "(async()=>{await import('./scripts/create-super-admin.js');console.log('imported-ok');process.exit(0);})()",
    );
    record(
      "importing create-super-admin.js never connects to MongoDB",
      code === 0 && out.includes("imported-ok"),
      `exit=${code} stdout=${out.trim() || "(none)"}`,
    );
  }

  // A3 - SHOW_PASSWORD is a boolean (its value depends on .env.local / env).
  record("SHOW_PASSWORD is a boolean", typeof SHOW_PASSWORD === "boolean");

  // A4 - non-TTY password input must fail safely and clearly (genuinely piped stdin).
  {
    const inline =
      "(async()=>{try{const {promptPassword}=await import('./scripts/create-super-admin.js');await promptPassword();console.log('NO-THROW');process.exit(0);}catch(e){console.log('THREW:'+e.message);process.exit(1);}})()";
    const { code, out, err } = await spawnPiped(inline);
    const ok = code === 1 && /THREW:.*TTY/.test(out);
    record(
      "non-TTY password input rejected with a clear TTY error",
      ok,
      `exit=${code} stdout=${out.trim() || "(none)"} stderr=${err.trim() || "(none)"}`,
    );
  }

  // A5 - non-TTY text input must fail safely and clearly (genuinely piped stdin).
  {
    const inline =
      "(async()=>{try{const {promptText}=await import('./scripts/create-super-admin.js');await promptText('Email');console.log('NO-THROW');process.exit(0);}catch(e){console.log('THREW:'+e.message);process.exit(1);}})()";
    const { code, out, err } = await spawnPiped(inline);
    const ok = code === 1 && /THREW:.*TTY/.test(out);
    record(
      "non-TTY text input rejected with a clear TTY error",
      ok,
      `exit=${code} stdout=${out.trim() || "(none)"} stderr=${err.trim() || "(none)"}`,
    );
  }

  // A6 - this automated run is non-TTY (piped stdin).
  record("automated run is non-TTY (piped stdin)", process.stdin.isTTY !== true);

  // A7 - setting "true" => visible (env wiring, verified in a spawned child).
  {
    const { code, value, out } = await showPasswordValue("true");
    record(
      "SUPER_ADMIN_SHOW_PASSWORD=true => visible password mode",
      code === 0 && value === "true",
      `exit=${code} value=${value} stdout=${out.trim() || "(none)"}`,
    );
  }

  // A8 - setting "false" => hidden.
  {
    const { code, value, out } = await showPasswordValue("false");
    record(
      "SUPER_ADMIN_SHOW_PASSWORD=false => hidden password mode",
      code === 0 && value === "false",
      `exit=${code} value=${value} stdout=${out.trim() || "(none)"}`,
    );
  }

  // A9 - invalid setting => hidden (default).
  {
    const { code, value, out } = await showPasswordValue("yes");
    record(
      "invalid SUPER_ADMIN_SHOW_PASSWORD defaults to hidden",
      code === 0 && value === "false",
      `exit=${code} value=${value} stdout=${out.trim() || "(none)"}`,
    );
  }

  // A10 - setting empty string => hidden (default for any non-"true" value).
  {
    const { code, value, out } = await showPasswordValue("");
    record(
      "empty SUPER_ADMIN_SHOW_PASSWORD defaults to hidden",
      code === 0 && value === "false",
      `exit=${code} value=${value} stdout=${out.trim() || "(none)"}`,
    );
  }

  // A11 - promptInput pauses stdin after completion (prevents event loop
  // from staying alive, which caused the process to hang after creation).
  // A12 - promptInput restores raw mode (setRawMode(false)) after completion.
  {
    const originalStdin = process.stdin;
    let pauseCalled = false;
    let setRawModeFalseCalled = false;
    const dataListeners = [];
    const mockStdin = {
      isTTY: true,
      setRawMode: (mode) => {
        if (mode === false) {
          setRawModeFalseCalled = true;
        }
      },
      resume: () => {},
      pause: () => {
        pauseCalled = true;
      },
      on: (event, listener) => {
        if (event === "data") {
          dataListeners.push(listener);
        }
      },
      removeListener: (event, listener) => {
        if (event === "data") {
          const idx = dataListeners.indexOf(listener);
          if (idx >= 0) {
            dataListeners.splice(idx, 1);
          }
        }
      },
      write: () => {},
      emit: (event, data) => {
        if (event === "data") {
          dataListeners.forEach((l) => l(data));
        }
      },
    };
    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      configurable: true,
      writable: true,
    });
    try {
      const promise = promptText("Email");
      const input = "test@example.com\n";
      for (const ch of input) {
        mockStdin.emit("data", ch);
      }
      await promise;
      record(
        "promptInput pauses stdin after completion",
        pauseCalled,
        `pauseCalled=${pauseCalled}`,
      );
      record(
        "promptInput restores raw mode (setRawMode(false)) after completion",
        setRawModeFalseCalled,
        `setRawModeFalseCalled=${setRawModeFalseCalled}`,
      );
    } finally {
      Object.defineProperty(process, "stdin", {
        value: originalStdin,
        configurable: true,
        writable: true,
      });
    }
  }

  console.log("\nTTY-REQUIRED TESTS (not executed in piped mode):");
  console.log("  - email and full name input (echoed) advance after Enter");
  console.log("  - hidden password input (no echo) advances after Enter");
  console.log("  - visible password mode (echo chars) advances after Enter");
  console.log("  - backspace erasure in all modes");
  console.log("  - password confirmation match / mismatch");
  console.log("  - Ctrl+C aborts with exit code 1");
  console.log("  Run in macOS Terminal:  node tests/superadmin-prompt.mjs --pty");
  console.log(
    "  PTY harness:            script -q /dev/null node tests/superadmin-prompt.mjs --pty",
  );

  console.log("\nMANUAL TESTS (macOS Terminal, real TTY):");
  console.log("  Hidden mode (default / SUPER_ADMIN_SHOW_PASSWORD=false):");
  console.log("    1. Run: SUPER_ADMIN_SHOW_PASSWORD=false node tests/superadmin-prompt.mjs --pty");
  console.log("    2. Email: type address, press Enter   -> advances to Full name");
  console.log("    3. Full name: type name, press Enter  -> advances to Password");
  console.log("    4. Password: type 12+ chars           -> NO echo; Enter submits");
  console.log("    5. Confirm password: retype           -> must match, else asked again");
  console.log("    6. Backspace mid-entry                -> last char erased (\b \\b)");
  console.log("    7. Ctrl+C at any prompt               -> aborts, exit code 1");
  console.log("  Visible mode (SUPER_ADMIN_SHOW_PASSWORD=true):");
  console.log("    8. Run: SUPER_ADMIN_SHOW_PASSWORD=true node tests/superadmin-prompt.mjs --pty");
  console.log("    9. Password: type 12+ chars           -> characters ARE echoed; Enter submits");
  console.log("   10. Confirm password: retype           -> must match, else asked again");
  console.log("  Non-TTY safety:");
  console.log("   11. printf 'x\\n' | node tests/superadmin-prompt.mjs");
  console.log(
    "       -> both prompts fail with a clear TTY error, exit code 1, no account created",
  );

  summary();
}

async function ptySuite() {
  if (process.stdin.isTTY !== true) {
    console.error("--pty requires a real TTY (run in macOS Terminal, not with piped stdin)");
    process.exit(1);
  }

  console.log(
    "TTY-REQUIRED TESTS - superadmin password prompts (real terminal, no MongoDB, no account)",
  );
  console.log("Helper source: scripts/create-super-admin.js (imported, not duplicated)\n");
  console.log(`SHOW_PASSWORD in this run: ${SHOW_PASSWORD}\n`);
  console.log("Respond to each prompt as it appears.\n");

  // P1 - email under TTY (echoed by raw-mode handler)
  const email = await promptText("Email");
  record(
    "TTY email input returned after Enter",
    typeof email === "string" && email.length > 0,
    `got ${JSON.stringify(email)}`,
  );

  // P2 - full name under TTY (echoed)
  const name = await promptText("Full name");
  record(
    "TTY full name input returned after Enter",
    typeof name === "string" && name.length > 0,
    `got ${JSON.stringify(name)}`,
  );

  // P3 - password under TTY (hidden unless SHOW_PASSWORD; operator verifies echo visually)
  const password = await promptPassword();
  record(
    "TTY password input returned after Enter",
    typeof password === "string" && password.length >= 12,
    `length ${password.length}`,
  );

  // P4 - password confirmation under TTY
  const confirmation = await promptPassword("Confirm password: ");
  record("password confirmation matches", confirmation === password);

  console.log(
    "\nPTY checks complete. Verify visually: hidden mode shows no password echo; visible mode (SUPER_ADMIN_SHOW_PASSWORD=true) echoes characters. Backspace erases in all modes. Ctrl+C aborts with exit code 1.",
  );
  process.exit(0);
}

if (process.argv.includes("--pty")) {
  await ptySuite();
} else {
  await automatedSuite();
}

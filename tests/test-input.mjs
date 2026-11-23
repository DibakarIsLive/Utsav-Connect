/**
 * tests/test-input.mjs
 *
 * Tests the input helper functions from scripts/create-super-admin.js
 * without connecting to MongoDB or creating accounts.
 *
 * Usage:
 *   printf 'test@example.com\nLocal Test Admin\ntest-pass-123\n' | node tests/test-input.mjs
 */

import { promptText, promptPassword } from "../scripts/create-super-admin.js";

async function main() {
  console.log("Testing input handling:\n");

  // Test 1: Visible text input (email)
  process.stdout.write("Email: ");
  const email = await promptText("Email");
  console.log(`Email entered: ${JSON.stringify(email)}`);
  console.log(`Length: ${email.length}`);
  console.log(`Matches expected: ${email === "test@example.com"}`);

  // Test 2: Visible text input (name)
  process.stdout.write("Full name: ");
  const name = await promptText("Full name");
  console.log(`Name entered: ${JSON.stringify(name)}`);
  console.log(`Name length: ${name.length}`);
  console.log(`Name matches expected: ${name === "Local Test Admin"}`);

  // Test 3: Hidden password input
  process.stdout.write("Password (min 12 characters): ");
  const password = await promptPassword();
  console.log(`Password length: ${password.length}`);
  console.log(`Password matches expected: ${password === "test-pass-123"}`);

  console.log("\nAll input tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});

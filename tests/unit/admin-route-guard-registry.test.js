import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "acorn";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN_API_DIR = join(ROOT, "app", "api", "admin");
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const SUPER_ADMIN_ONLY = "SUPER_ADMIN";

// Explicit registry. Set equality with the discovered routes makes both an
// unguarded new route and a stale expectation fail the build.
const EXPECTED = {
  "/api/admin/audit-logs": { GET: "audit:read:all" },
  "/api/admin/invitations": { GET: "invitation-report:read:all" },
  "/api/admin/invitations/[id]/review": { POST: "invitation-report:read:all" },
  "/api/admin/accounts": { GET: "devotee:read:all" },
  "/api/admin/accounts/[id]": { GET: "devotee:read:all", DELETE: null },
  "/api/admin/accounts/[id]/status": { PATCH: "devotee:status:update" },
  "/api/admin/stats": { GET: "application:read:all" },
  "/api/admin/applications": { GET: "application:read:all" },
  "/api/admin/applications/[id]": { GET: "application:read:all" },
  "/api/admin/applications/[id]/review": { POST: "application:review:all" },
  "/api/admin/applications/[id]/note": { POST: "application:note:write" },
  "/api/admin/areas": { GET: "area:manage", POST: "area:manage" },
  "/api/admin/areas/[id]": { GET: "area:manage", PATCH: "area:manage", DELETE: "area:manage" },
  "/api/admin/areas/proposals": { GET: "proposal:review" },
  "/api/admin/areas/proposals/[id]/review": {
    GET: "proposal:review",
    POST: "proposal:review",
  },
  "/api/admin/users": { GET: SUPER_ADMIN_ONLY, POST: SUPER_ADMIN_ONLY },
  "/api/admin/users/[id]": { PATCH: SUPER_ADMIN_ONLY },
  "/api/admin/users/invitations": { GET: SUPER_ADMIN_ONLY, POST: SUPER_ADMIN_ONLY },
  "/api/admin/users/invitations/[id]/revoke": { PATCH: SUPER_ADMIN_ONLY },
};

function findRouteFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...findRouteFiles(full));
    else if (entry.name === "route.js") files.push(full);
  }
  return files;
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === "object" && value.type) walk(value, visit);
  }
}

function permissionFromArgument(argument) {
  if (!argument) return null;
  if (argument.type === "MemberExpression" && argument.object.name === "ADMIN_PERMISSIONS") {
    return ADMIN_PERMISSIONS[argument.property.name];
  }
  return `UNRESOLVED:${argument.type}`;
}

function analyse(file) {
  const source = readFileSync(file, "utf8");
  const ast = parse(source, { ecmaVersion: 2022, sourceType: "module" });
  const routePath =
    "/api/admin/" + relative(ADMIN_API_DIR, dirname(file)).split(sep).filter(Boolean).join("/");
  const handlers = {};

  for (const node of ast.body) {
    if (node.type !== "ExportNamedDeclaration" || !node.declaration) continue;
    const declaration = node.declaration;
    if (declaration.type !== "FunctionDeclaration") continue;
    const method = declaration.id?.name;
    if (!HTTP_METHODS.has(method)) continue;

    const guards = [];
    let hasOriginCheck = false;
    walk(declaration.body, (child) => {
      if (child.type !== "CallExpression" || child.callee.type !== "Identifier") return;
      if (child.callee.name === "assertTrustedOrigin") hasOriginCheck = true;
      if (child.callee.name === "requireSuperAdmin") guards.push(SUPER_ADMIN_ONLY);
      if (child.callee.name === "requireAdmin") {
        guards.push(permissionFromArgument(child.arguments[1]));
      }
    });
    handlers[method] = { guards, hasOriginCheck };
  }
  return { routePath, handlers };
}

describe("Admin API authorization registry", () => {
  const discovered = Object.fromEntries(
    findRouteFiles(ADMIN_API_DIR).map((file) => {
      const { routePath, handlers } = analyse(file);
      return [routePath, handlers];
    }),
  );

  it("discovers exactly the expected admin routes and handlers", () => {
    expect(Object.keys(discovered).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const [routePath, methods] of Object.entries(EXPECTED)) {
      expect(Object.keys(discovered[routePath]).sort(), routePath).toEqual(
        Object.keys(methods).sort(),
      );
    }
  });

  it("requires exactly one server-side guard in every admin handler", () => {
    for (const [routePath, methods] of Object.entries(EXPECTED)) {
      for (const method of Object.keys(methods)) {
        const handler = discovered[routePath][method];
        expect(handler.guards, `${method} ${routePath}`).toHaveLength(1);
        expect(handler.guards[0], `${method} ${routePath}`).toBe(methods[method]);
      }
    }
  });

  it("rejects unresolved or unknown permission constants", () => {
    const valid = new Set(Object.values(ADMIN_PERMISSIONS));
    for (const handlers of Object.values(discovered)) {
      for (const handler of Object.values(handlers)) {
        for (const guard of handler.guards) {
          if (guard === null || guard === SUPER_ADMIN_ONLY) continue;
          expect(valid.has(guard), String(guard)).toBe(true);
        }
      }
    }
  });

  it("checks trusted origin on every mutating handler", () => {
    for (const [routePath, handlers] of Object.entries(discovered)) {
      for (const [method, handler] of Object.entries(handlers)) {
        if (method === "GET") continue;
        expect(handler.hasOriginCheck, `${method} ${routePath}`).toBe(true);
      }
    }
  });

  it("documents the one permission-less requireAdmin as a service-delegated exception", () => {
    expect(EXPECTED["/api/admin/accounts/[id]"].DELETE).toBeNull();
    const source = readFileSync(join(ADMIN_API_DIR, "accounts", "[id]", "route.js"), "utf8");
    expect(source).toMatch(/deleteAccount/);
  });
});

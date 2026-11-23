# =============================================================================
# Utsav-Connect — root Makefile
#
# Single-runtime project (one Next.js app, npm). Every target wraps a real
# npm script from package.json; the README documents the same commands.
#
# Conventions:
#   - Targets never delete env files, databases, or anything under .local/
#     except the test scratch folder.
#   - `stop` only kills the process listening on $(PORT) (default 3000).
#   - MongoDB (Atlas) is never started, stopped, or modified here; `check-db`
#     and `check-pilot` only ping it with MONGODB_URI from .env.local.
#   - Secrets are never printed: connection strings, API keys, and passwords
#     are always masked or omitted from output.
# =============================================================================

.DEFAULT_GOAL := help
SHELL := /bin/bash
.ONESHELL:

# ---- Configuration (override on the command line: make dev PORT=4000) -------
PORT       ?= 3000
APP_URL    ?= http://localhost:$(PORT)
NPM        ?= npm
BROWSER    ?= $(shell command -v open >/dev/null 2>&1 && echo open || \
               command -v xdg-open >/dev/null 2>&1 && echo xdg-open || \
               echo start)

# ---- Terminal design system -------------------------------------------------
# Respect NO_COLOR and non-TTY environments. Colours use actual ESC
# characters (captured via shell printf) so they work correctly with both
# printf and echo in bash.
#
# Palette:
#   MAGENTA  branding / section headings
#   CYAN     informational messages
#   GREEN    success
#   YELLOW   warnings
#   RED      errors
#   DIM      secondary information
#   BOLD     emphasis

ifeq ($(NO_COLOR),)
  COLOR_ENABLED := 1
else
  COLOR_ENABLED :=
endif

# Detect whether stdout is a TTY; disable colours when piped/redirected
IS_TTY := $(shell [ -t 1 ] && echo 1)

ifeq ($(COLOR_ENABLED),1)
  ifeq ($(IS_TTY),1)
    COLOR_ENABLED := 1
  else
    COLOR_ENABLED :=
  endif
endif

ifeq ($(COLOR_ENABLED),1)
  ESC := $(shell printf '\033')
  ifeq ($(ESC),)
    ESC := \e
  endif
  RESET   := $(ESC)[0m
  BOLD    := $(ESC)[1m
  DIM     := $(ESC)[2m
  CYAN    := $(ESC)[36m
  GREEN   := $(ESC)[32m
  YELLOW  := $(ESC)[33m
  RED     := $(ESC)[31m
  MAGENTA := $(ESC)[35m
  BLUE    := $(ESC)[34m
  WHITE   := $(ESC)[37m
else
  RESET   :=
  BOLD    :=
  DIM     :=
  CYAN    :=
  GREEN   :=
  YELLOW  :=
  RED     :=
  MAGENTA :=
  BLUE    :=
  WHITE   :=
endif

# Status prefixes
OK   := $(GREEN)✓$(RESET)
WARN := $(YELLOW)⚠$(RESET)
ERR  := $(RED)✗$(RESET)
INFO := $(CYAN)ℹ$(RESET)
STEP := $(MAGENTA)◆$(RESET)
ARROW:= $(CYAN)→$(RESET)

# Box-drawing characters
HLINE    := $(MAGENTA)─$(RESET)
VCORNER  := $(MAGENTA)│$(RESET)
TL_CORNER:= $(MAGENTA)╭$(RESET)
TR_CORNER:= $(MAGENTA)╮$(RESET)
BL_CORNER:= $(MAGENTA)╰$(RESET)
BR_CORNER:= $(MAGENTA)╯$(RESET)

# Box lines (no shell variable refs — safe for Make vars)
BOX_TOP    := $(TL_CORNER)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(TR_CORNER)
BOX_BOTTOM := $(BL_CORNER)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(HLINE)$(BR_CORNER)

# Box width: 58 ─ between corners = 60 total; inside = 58; left "│  " = 3; right "  │" = 3;
# title + padding = 52 chars. Helper prints a middle line with dynamic padding.
# Usage in a recipe:
#   @TITLE="My Title"; \
#   PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
#   printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"

# =============================================================================
# HELP
# =============================================================================
help: ## Show this help
	@printf '$(MAGENTA)╭──────────────────────────────────────────────────────────────────────╮$(RESET)\n'
	@printf '$(MAGENTA)│$(RESET) $(BOLD)             Utsav-Connect — Mahotsav Outreach Platform              $(RESET)$(MAGENTA)│$(RESET)\n'
	@printf '$(MAGENTA)│$(RESET) $(DIM)           Next.js 16 · JavaScript/JSX only · MongoDB Atlas          $(RESET)$(MAGENTA)│$(RESET)\n'
	@printf '$(MAGENTA)╰──────────────────────────────────────────────────────────────────────╯$(RESET)\n'
	@printf '$(BOLD)Usage:$(RESET) make $(CYAN)<target>$(RESET) [PORT=3000]\n\n'
	@printf '$(BOLD)Categories:$(RESET)\n'
	@printf '  $(MAGENTA)setup:$(RESET)       doctor, install, setup-env\n'
	@printf '  $(MAGENTA)dev:$(RESET)         dev, build, start, open\n'
	@printf '  $(MAGENTA)db:$(RESET)          check-db, check-pilot, check-super-admin, users\n'
	@printf '  $(MAGENTA)test:$(RESET)        test-unit, test-integration, test-superadmin-prompt, test, check, ci\n'
	@printf '  $(MAGENTA)auth:$(RESET)        createsuperuser, recover-super-admin\n'
	@printf '  $(MAGENTA)email:$(RESET)       check-email, show-mail\n'
	@printf '  $(MAGENTA)deps:$(RESET)        next-upgrade-check, next-upgrade\n'
	@printf '  $(MAGENTA)util:$(RESET)        status, show-urls, stop, clean-cache, clean\n\n'
	@printf '$(MAGENTA)Target list:$(RESET)\n'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-26s$(RESET) %s\n", $$1, $$2}'
	@printf '\n$(DIM)Typical flow:$(RESET) make install → make setup-env → make check-db → make dev\n'
	@printf '$(DIM)First-time setup:$(RESET) make doctor → make install → make setup-env → make check-db\n'

# ---- Setup ------------------------------------------------------------------
doctor: ## Check required tools (node, npm) and whether .env.local exists
	@printf '$(BOX_TOP)\n'
	@TITLE="Toolchain"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@command -v node >/dev/null 2>&1 && printf '  $(OK) $(CYAN)node$(RESET)  %s\n' "$$(node --version)" || { printf '  $(ERR) $(RED)node not found$(RESET)  (need >= 20.12)\n'; exit 1; }
	@command -v $(NPM) >/dev/null 2>&1 && printf '  $(OK) $(CYAN)npm$(RESET)   %s\n' "$$($(NPM) --version)" || { printf '  $(ERR) $(RED)npm not found$(RESET)\n'; exit 1; }
	@command -v mongosh >/dev/null 2>&1 && printf '  $(OK) $(CYAN)mongosh$(RESET) %s $(DIM)(optional)$(RESET)\n' "$$(mongosh --version)" || printf '  $(DIM)-$(RESET) mongosh not installed (optional)\n'
	@[ -f .env.local ] && printf '  $(OK) $(CYAN).env.local$(RESET) present\n' || printf '  $(WARN) $(YELLOW).env.local missing$(RESET)  → run: make setup-env\n'

install: ## Install dependencies from package-lock.json
	@printf '$(BOX_TOP)\n'
	@TITLE="Installing dependencies"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) install --no-audit --no-fund

setup-env: ## Create .env.local from .env.example (never overwrites); then add your Atlas URIs
	@printf '$(BOX_TOP)\n'
	@TITLE="Environment setup"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@if [ -f .env.local ]; then \
		printf '  $(WARN) $(YELLOW).env.local already exists$(RESET) — not touched.\n'; \
	else \
		cp .env.example .env.local && printf '  $(OK) $(GREEN)Created .env.local$(RESET) — now set MONGODB_URI and MONGODB_URI_TEST to your Atlas connection strings.\n'; \
	fi

# ---- Development ------------------------------------------------------------

dev: ## Start Next.js dev server in the foreground (PORT, default 3000)
	@printf '$(BOX_TOP)\n'; \
	TITLE="Development server"; \
	printf '%s%s%s%*s%s\n' \
		'$(VCORNER)  ' \
		'$(BOLD)' \
		"$$TITLE$(RESET)" \
		"$$((39 - 2 - $${#TITLE}))" \
		'' \
		'$(VCORNER)'; \
	printf '$(BOX_BOTTOM)\n'; \
	printf '$(STEP) $(BOLD)Starting Utsav-Connect development server...$(RESET)\n'; \
	$(NPM) run dev -- --port $(PORT)

next-upgrade-check: ## Read-only: show declared/installed Next.js, latest stable and advisory status
	@node -e 'const p=require("./package.json"),l=require("./package-lock.json");console.log("declared  :",p.dependencies.next);console.log("installed :",l.packages["node_modules/next"]?.version);console.log("lint cfg  :",p.devDependencies["eslint-config-next"]);console.log("react     :",p.dependencies.react,"/",p.dependencies["react-dom"]);'
	@echo "latest stable: $$(npm view next version)"
	@npm audit --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=(JSON.parse(s).vulnerabilities||{}).next;console.log("next advisory:",v?v.severity+" range="+v.range+" fix="+JSON.stringify(v.fixAvailable):"none")})'
	@echo "No files changed. This target never invokes a coding agent or next upgrade."

next-upgrade: ## Upgrade Next.js + eslint-config-next to NEXT_TARGET (dry run unless CONFIRM=1)
ifeq ($(strip $(NEXT_TARGET)),)
	@echo "Set NEXT_TARGET=<version> (see make next-upgrade-check)."
	@exit 1
else
	@echo "Proposed: next@$(NEXT_TARGET) and eslint-config-next@$(NEXT_TARGET) (React unchanged)."
	@echo "Expected: package.json and package-lock.json changes; review before committing."
ifeq ($(strip $(CONFIRM)),1)
	$(NPM) install --save-exact next@$(NEXT_TARGET)
	$(NPM) install --save-dev --save-exact eslint-config-next@$(NEXT_TARGET)
	@node -e 'const p=require("./package.json"),l=require("./package-lock.json");if(p.dependencies.next!=="$(NEXT_TARGET)"||p.devDependencies["eslint-config-next"]!=="$(NEXT_TARGET)"){console.error("version verification failed");process.exit(1)}console.log("verified declared versions:",p.dependencies.next,p.devDependencies["eslint-config-next"]);console.log("verified lockfile next:",l.packages["node_modules/next"]?.version)'
	@echo "No coding agent was invoked. Verify with: make check && npm run build && make test-e2e"
else
	@echo "Dry run only. Re-run with CONFIRM=1 to install."
endif
endif

build: ## Create the production build (.next/)
	@printf '$(BOX_TOP)\n'
	@TITLE="Production build"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run build

start: ## Serve the production build (PORT, default 3000); run `make build` first
	@printf '$(BOX_TOP)\n'
	@TITLE="Production server"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run start -- --port $(PORT)

# ---- Quality ----------------------------------------------------------------
lint: ## Run ESLint
	@printf '$(BOX_TOP)\n'
	@TITLE="ESLint"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run lint

lint-fix: ## Run ESLint with --fix
	@printf '$(BOX_TOP)\n'
	@TITLE="ESLint fix"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run lint:fix

format: ## Format all files with Prettier
	@printf '$(BOX_TOP)\n'
	@TITLE="Format"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run format

format-check: ## Verify formatting without writing
	@printf '$(BOX_TOP)\n'
	@TITLE="Format check"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run format:check

check-js-only: ## Fail if any TypeScript file or config exists
	@printf '$(BOX_TOP)\n'
	@TITLE="JavaScript-only check"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run check:js-only

test-unit: ## Run unit tests (no database required)
	@printf '$(BOX_TOP)\n'
	@TITLE="Unit tests"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run test:unit

test-integration: ## Run integration tests (needs MongoDB; skips with a notice if unreachable)
	@printf '$(BOX_TOP)\n'
	@TITLE="Integration tests"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run test:integration

test-superadmin-prompt: ## Test super-admin input prompts (no MongoDB, no account creation; run --pty in a real TTY)
	@printf '$(BOX_TOP)\n'
	@TITLE="Super Admin prompt tests"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run test:superadmin-prompt

seed-e2e: ## Seed the isolated E2E database (test database only, tagged records)
	node scripts/seed-e2e.mjs

clean-e2e: ## Remove only tagged E2E fixture records from the test database
	node scripts/seed-e2e.mjs --clean

e2e-status: ## Read-only count of tagged E2E fixture records
	node scripts/seed-e2e.mjs --status

dev-e2e: ## Start the dev server against the E2E test database (E2E_PORT, default 3100)
	node scripts/serve-e2e.mjs

test-e2e: ## Seed the test database and run Playwright (managed test-DB server; run `make build` first)
	node scripts/seed-e2e.mjs
	$(NPM) exec playwright test

test: ## Run the whole test suite
	@printf '$(BOX_TOP)\n'
	@TITLE="Full test suite"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) test

check: ## Quality gate: JS-only + lint + format-check + unit tests (no DB needed)
	@printf '$(BOX_TOP)\n'
	@TITLE="Quality gate"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run check

ci: ## check + integration tests (MongoDB required, no skipping) + production build
	@printf '$(BOX_TOP)\n'
	@TITLE="CI pipeline"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run check
	UTSAV_TEST_REQUIRE_DB=1 $(NPM) run test:integration
	$(NPM) run build

# ---- Database ---------------------------------------------------------------
check-db: ## Ping MongoDB (Atlas) using MONGODB_URI from .env.local; shows database name only
	@printf '$(BOX_TOP)\n'
	@TITLE="Database ping"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	$(NPM) run check:db

check-pilot: ## Verify pilot database configuration; shows database names only, never credentials
	@printf '$(BOX_TOP)\n'
	@TITLE="Pilot database config"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node scripts/check-database-config.js

check-super-admin: ## Read-only: inspect Super Admin accounts in the pilot database (role/status only)
	@printf '$(BOX_TOP)\n'
	@TITLE="Super Admin inspection"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node --conditions=react-server scripts/check-super-admin.js

db-inspect: ## Read-only: inspect the application database (user counts by role/status, safe listing)
	@printf '$(BOX_TOP)\n'
	@TITLE="Database inspection"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node --conditions=react-server scripts/db-inspect.js

users: ## List local development test credential registry accounts (no plaintext passwords)
	@printf '$(BOX_TOP)\n'
	@TITLE="Local test user registry"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node scripts/list-test-users.js

# ---- Authentication & Administration ----------------------------------------
createsuperuser: ## Interactively create the first Super Admin (prompts for email, name, password, confirmation; uses MONGODB_URI)
	@printf '$(BOX_TOP)\n'
	@TITLE="Super Admin bootstrap"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@node scripts/check-database-config.js 2>/dev/null || true
	@printf '\n'
	@printf '  $(OK) $(CYAN)Database configuration verified$(RESET)\n'
	@printf '\n'
	@read -p '$(STEP) $(BOLD)Proceed? [y/N]$(RESET) ' confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(NPM) run auth:create-super-admin; \
	else \
		printf '  $(WARN) $(YELLOW)Aborted.$(RESET)\n'; \
	fi

recover-super-admin: ## Create a second Super Admin (emergency recovery only)
	@printf '$(BOX_TOP)\n'
	@TITLE="Super Admin recovery"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	printf '  $(ERR) $(RED)⚠ RECOVERY MODE$(RESET)\n'
	printf '  $(WARN) $(YELLOW)This creates a second Super Admin. Use only if the first is compromised.$(RESET)\n'
	@read -p '$(STEP) $(BOLD)Proceed? [y/N]$(RESET) ' confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		printf '  $(WARN) $(YELLOW)Aborted.$(RESET)\n'; exit 0; \
	fi
	$(NPM) run auth:create-super-admin -- --recovery

# ---- Email ------------------------------------------------------------------
check-email: ## Show email configuration status (provider, sender, no credentials)
	@printf '$(BOX_TOP)\n'
	@TITLE="Email configuration"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node scripts/check-email-config.js

show-mail: ## List dev email files in .local/mail/ (no real email sent)
	@printf '$(BOX_TOP)\n'
	@TITLE="Development email"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node scripts/show-local-paths.mjs --mail

show-local-paths: ## Print the resolved project-local data directories (no secrets)
	@printf '$(BOX_TOP)\n'
	@TITLE="Local data paths"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	node scripts/show-local-paths.mjs

# ---- Operations -------------------------------------------------------------
check-health: ## Non-blocking: ping MongoDB via .env.local and check whether the app listens on PORT
	@printf '$(BOX_TOP)\n'
	@TITLE="Health check"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@if OUT="$$($(NPM) run -s check:db 2>&1)"; then \
		printf '  $(OK) $(CYAN)MongoDB$(RESET)  %s\n' "$$OUT"; \
	else \
		printf '  $(ERR) $(RED)MongoDB$(RESET)  %s\n' "$$OUT"; \
		printf '           $(DIM)→ check MONGODB_URI in .env.local and Atlas Database/Network Access$(RESET)\n'; \
	fi
	@if lsof -nP -iTCP:$(PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
		printf '  $(OK) $(CYAN)Next.js$(RESET)  listening on :$(PORT)\n'; \
	else \
		printf '  $(DIM)-$(RESET) Next.js  nothing on :$(PORT)\n'; \
	fi

health: ## Call the running app's /api/health endpoint
	@curl -s -w "\nHTTP %{http_code}\n" $(APP_URL)/api/health || printf '  $(ERR) $(RED)App not reachable at $(APP_URL)$(RESET)\n'

status: ## Git branch, working-tree summary, and listening ports
	@printf '$(BOX_TOP)\n'
	@TITLE="Repository status"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@printf '$(BOLD)Git$(RESET)  %s @ %s\n' "$$(git rev-parse --abbrev-ref HEAD)" "$$(git rev-parse --short HEAD)"
	@git status --short | head -20
	@$(MAKE) --no-print-directory check-health

show-urls: ## Print local URLs
	@printf '$(BOX_TOP)\n'
	@TITLE="Local URLs"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@printf '  $(CYAN)App$(RESET)     $(APP_URL)\n'
	@printf '  $(CYAN)Health$(RESET)  $(APP_URL)/api/health\n'

open: ## Open the app in the default browser
	@if curl -sf "$(APP_URL)/api/health" >/dev/null 2>&1; then \
		$(BROWSER) "$(APP_URL)" >/dev/null 2>&1 & \
		printf '  $(OK) $(CYAN)Opened$(RESET) $(APP_URL) in browser\n'; \
	else \
		printf '  $(ERR) $(RED)App not reachable at $(APP_URL).$(RESET) Start it with: make dev\n'; \
	fi

stop: ## Stop whatever is listening on PORT (only that port)
	@printf '$(BOX_TOP)\n'
	@TITLE="Stop server"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	@PIDS="$$(lsof -nP -iTCP:$(PORT) -sTCP:LISTEN -t 2>/dev/null)"; \
	if [ -n "$$PIDS" ]; then kill $$PIDS && printf '  $(OK) $(CYAN)Stopped$(RESET) pid(s) $$PIDS on :$(PORT)\n'; \
	else printf '  $(DIM)-$(RESET) Nothing listening on :$(PORT)\n'; fi

# ---- Cleanup (SAFE: never touches .env*, databases, or .local/mongo-*) -------
clean-cache: ## Remove build output and test scratch (.next, coverage, .local/test-scratch)
	@printf '$(BOX_TOP)\n'
	@TITLE="Clean cache"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	rm -rf .next coverage .local/test-scratch

clean: clean-cache ## clean-cache + node_modules (re-run `make install` afterwards)
	@printf '$(BOX_TOP)\n'
	@TITLE="Clean all"; \
	PAD=$$(printf '%*s' $$((52 - $${#TITLE})) ''); \
	printf "$(VCORNER)  $(BOLD)$$TITLE$(RESET)$$PAD$(VCORNER)\n"
	@printf '$(BOX_BOTTOM)\n'
	rm -rf node_modules

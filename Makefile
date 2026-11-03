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
#   - MongoDB is never started or stopped here; `check-health` only probes it.
# =============================================================================

.DEFAULT_GOAL := help
SHELL := /bin/sh

# ---- Configuration (override on the command line: make dev PORT=4000) -------
PORT       ?= 3000
MONGO_PORT ?= 27017
APP_URL    ?= http://localhost:$(PORT)
NPM        ?= npm

# ---- Colours ----------------------------------------------------------------
RESET  := \033[0m
BOLD   := \033[1m
DIM    := \033[2m
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m

.PHONY: help doctor install setup-env dev build start lint lint-fix format format-check \
        test test-unit test-integration check-js-only check-db check ci \
        check-health health status show-urls open stop clean clean-cache

# -----------------------------------------------------------------------------
help: ## Show this help
	@printf "$(BOLD)Utsav-Connect$(RESET) — Next.js (JavaScript only) + MongoDB\n\n"
	@printf "$(BOLD)Usage:$(RESET) make $(CYAN)<target>$(RESET) [PORT=3000] [MONGO_PORT=27017]\n\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'
	@printf "\n$(DIM)Typical flow: make install → make setup-env → (start MongoDB) → make dev$(RESET)\n"

# ---- Setup ------------------------------------------------------------------
doctor: ## Check required tools (node, npm) and report versions
	@printf "$(BOLD)Toolchain$(RESET)\n"
	@command -v node >/dev/null 2>&1 && printf "  node  %s\n" "$$(node --version)" || { printf "  $(RED)node not found$(RESET) (need >= 20.12)\n"; exit 1; }
	@command -v $(NPM) >/dev/null 2>&1 && printf "  npm   %s\n" "$$($(NPM) --version)" || { printf "  $(RED)npm not found$(RESET)\n"; exit 1; }
	@command -v mongod >/dev/null 2>&1 && printf "  mongod %s\n" "$$(mongod --version | head -1)" || printf "  $(YELLOW)mongod not on PATH$(RESET) (optional: any reachable MongoDB works)\n"
	@[ -f .env.local ] && printf "  .env.local present\n" || printf "  $(YELLOW).env.local missing$(RESET) → run: make setup-env\n"

install: ## Install dependencies from package-lock.json
	$(NPM) install --no-audit --no-fund

setup-env: ## Create .env.local from .env.example (never overwrites)
	@if [ -f .env.local ]; then \
		printf "$(YELLOW).env.local already exists — not touched.$(RESET)\n"; \
	else \
		cp .env.example .env.local && printf "$(GREEN)Created .env.local$(RESET) — edit it if your MongoDB is not on localhost:27017.\n"; \
	fi

# ---- Run --------------------------------------------------------------------
dev: ## Start the Next.js development server (PORT, default 3000)
	$(NPM) run dev -- --port $(PORT)

build: ## Create the production build (.next/)
	$(NPM) run build

start: ## Serve the production build (PORT, default 3000); run `make build` first
	$(NPM) run start -- --port $(PORT)

# ---- Quality ----------------------------------------------------------------
lint: ## Run ESLint
	$(NPM) run lint

lint-fix: ## Run ESLint with --fix
	$(NPM) run lint:fix

format: ## Format all files with Prettier
	$(NPM) run format

format-check: ## Verify formatting without writing
	$(NPM) run format:check

check-js-only: ## Fail if any TypeScript file or config exists
	$(NPM) run check:js-only

test-unit: ## Run unit tests (no database required)
	$(NPM) run test:unit

test-integration: ## Run integration tests (needs MongoDB; skips with a notice if unreachable)
	$(NPM) run test:integration

test: ## Run the whole test suite
	$(NPM) test

check: ## Quality gate: JS-only + lint + format-check + unit tests (no DB needed)
	$(NPM) run check

ci: ## check + integration tests (MongoDB required, no skipping) + production build
	$(NPM) run check
	UTSAV_TEST_REQUIRE_DB=1 $(NPM) run test:integration
	$(NPM) run build

# ---- Operations -------------------------------------------------------------
check-db: ## Ping MongoDB using MONGODB_URI from .env.local
	$(NPM) run check:db

check-health: ## Non-blocking probe: is anything listening on MONGO_PORT (27017) and PORT (3000)?
	@if lsof -nP -iTCP:$(MONGO_PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
		printf "  $(GREEN)MongoDB$(RESET)  listening on :$(MONGO_PORT)\n"; \
	else \
		printf "  $(YELLOW)MongoDB$(RESET)  nothing on :$(MONGO_PORT) — start it (e.g. your MongoStart alias)\n"; \
	fi
	@if lsof -nP -iTCP:$(PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
		printf "  $(GREEN)Next.js$(RESET)  listening on :$(PORT)\n"; \
	else \
		printf "  $(DIM)Next.js  nothing on :$(PORT)$(RESET)\n"; \
	fi

health: ## Call the running app's /api/health endpoint
	@curl -s -w "\nHTTP %{http_code}\n" $(APP_URL)/api/health || printf "$(RED)App not reachable at $(APP_URL)$(RESET)\n"

status: ## Git branch, working-tree summary, and listening ports
	@printf "$(BOLD)Git$(RESET)  %s @ %s\n" "$$(git rev-parse --abbrev-ref HEAD)" "$$(git rev-parse --short HEAD)"
	@git status --short | head -20
	@$(MAKE) --no-print-directory check-health

show-urls: ## Print local URLs
	@printf "  App     $(APP_URL)\n  Health  $(APP_URL)/api/health\n"

open: ## Open the app in the default browser
	open $(APP_URL)

stop: ## Stop whatever is listening on PORT (only that port)
	@PIDS="$$(lsof -nP -iTCP:$(PORT) -sTCP:LISTEN -t 2>/dev/null)"; \
	if [ -n "$$PIDS" ]; then kill $$PIDS && printf "$(GREEN)Stopped$(RESET) pid(s) $$PIDS on :$(PORT)\n"; \
	else printf "$(DIM)Nothing listening on :$(PORT)$(RESET)\n"; fi

# ---- Cleanup (SAFE: never touches .env*, databases, or .local/mongo-*) -------
clean-cache: ## Remove build output and test scratch (.next, coverage, .local/test-scratch)
	rm -rf .next coverage .local/test-scratch

clean: clean-cache ## clean-cache + node_modules (re-run `make install` afterwards)
	rm -rf node_modules

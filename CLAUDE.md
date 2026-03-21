# TikTon — Claude Implementation Instructions

This file contains mandatory instructions for every Claude session implementing a module from `IMPLEMENTATION_PLAN.md`.

**Current module: 1 complete — next is Module 2 (Contract: ContentRegistry)**

---

## Keyword Commands

- **"Module X"** (e.g. "Module 1"): Implement **only** that module from `IMPLEMENTATION_PLAN.md`. Do not continue to the next module unless explicitly told to.
- **"Module X continue"**: The previous session ran out of context mid-module. Read `IMPLEMENTATION_PLAN.md` to identify where the module left off, check existing files with Glob to determine what was already created, then resume from the first incomplete step.
- **"Fix"**: A bug has been found. Read the relevant files, diagnose the root cause, and fix it. Do not implement anything beyond what is needed to fix the bug.
- **"Revert"**: The current module produced broken or unwanted code. Undo all changes made in the current module by deleting created files and restoring edited files to their prior state.

---

## Before Starting Any Module

1. **Read the plan**: Read `IMPLEMENTATION_PLAN.md` and identify the current module number, its Goal, Steps, and Verify checkpoint.
2. **Check what exists**: Use Glob to list files in the relevant workspace directory (`frontend/`, `backend/`, or `contracts/`) before writing anything. Never overwrite existing work without reading it first.
3. **Create a todo list**: Use TodoWrite to break the module's steps into tracked tasks before writing any code.

---

## During Implementation

### File operations
- Use **Read** before editing any existing file (required by the Edit tool).
- Use **Write** only for new files. Use **Edit** for modifications to existing files.
- Use **Glob** to find files, **Grep** to search content. Never use Bash for these.
- Never create extra files beyond what the module specifies. No additional READMEs, no extra utilities, no extra abstractions.

### Code standards
- All TypeScript: strict mode, no `any` unless unavoidable.
- No placeholder comments like `// TODO` or `// implement later` — either implement it or omit it.
- No console.log left in production code paths. Use it only during debugging, then remove.
- Keep code minimal — no extra error handling for impossible cases, no feature flags, no backwards-compatibility shims.
- Follow the exact file paths and function signatures specified in the plan. Do not rename or restructure.

### Running commands
- Always `cd` into the correct workspace directory before running npm commands.
- If a command fails, diagnose the root cause. Do not retry the same failing command.
- If a scaffolding command (e.g. `npm create`) asks interactive questions, pass all answers as CLI flags.
- Never run `npm install` from a workspace subdirectory — always from the repo root to respect workspaces.

### Environment variables
- Never hardcode secrets or addresses. Always read from `process.env.*`.
- When a module says to copy a deployed address to `.env`, remind the user to do so and pause if the next step depends on it.
- The `.env` file must exist (copied from `.env.example`) with `BOT_TOKEN`, `PLATFORM_WALLET_MNEMONIC`, `TON_API_KEY`, and `JWT_SECRET` filled before Modules 2–4 can deploy contracts. If these are missing, stop and tell the user.

### TON / blockchain specifics
- All contracts deploy to **testnet** only. Never use mainnet.
- After deploying a contract, print the address clearly and instruct the user to add it to `.env`.
- Jetton balance check is always two-step: `get_wallet_address` on Minter → `get_wallet_data` on Wallet. A missing wallet contract = 0 balance, not an error.
- `provider_token` for Telegram Stars invoices is always `""` (empty string). Currency is always `"XTR"`.

### Frontend specifics
- Telegram theme params must be mapped to CSS variables on app init (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-link`, `--tg-button`, `--tg-secondary-bg`).
- First video in the feed must start muted. Unmute only after the first user interaction.
- Always use `scroll-snap-type: y mandatory` on the feed container and `scroll-snap-align: start` per slide.
- iOS camera fallback: if `getUserMedia` throws, silently fall back to `<input type="file" accept="video/*" capture="camcorder">`.
- TonConnect manifest must be served from `/tonconnect-manifest.json` on the same origin as the frontend.

### Backend specifics
- Register all Fastify routes in `backend/src/index.ts` — never leave a route file unregistered.
- SQLite backup: restore from R2 on startup, backup every 2 minutes via `setInterval`.
- CORS must be configured from day 1 with the Vercel frontend domain.
- Platform wallet mnemonic is server-side only — never expose it to the frontend or logs.

---

## After Completing Each Module

1. **Run the Verify step** from the plan exactly as written. Do not skip it.
2. **Mark all todos as completed** in TodoWrite.
3. **Summarize** what was created: list each new file and its purpose in one line each.
4. **Commit**: stage all new and modified files for this module and commit with message `Module X: <short description>`. Then tell the user to push — do not run `git push` yourself.
5. **State the next module** number and its Goal so the user knows what comes next.
6. If the next module begins with a manual **STOP** checkpoint, clearly tell the user what they must do before continuing.

---

## Manual STOP Checkpoints

Do not proceed past these points without user confirmation:

| STOP | Before | Required action |
|------|--------|----------------|
| A | Module 1 | Telegram bot token, TON testnet wallet + mnemonic, TON Center API key |
| B | Module 7 | Cloudflare R2 bucket + credentials |
| C | Module 26 | 256x256 PNG logo at `frontend/public/icon.png` |
| D | After Module 27 | @BotFather `/newapp` with Vercel URL; upload 15-20 demo videos |

---

## Fee Splits (reference)

| Payment type | Creator | Platform |
|---|---|---|
| TON tips | 95% | 5% |
| Stars tips | 95% | 5% |
| Paid unlocks (Stars) | 92% | 8% |
| Subscriptions (TON) | 90% | 10% |

---

## Key Technical References

- initData validation: `secretKey = HMAC-SHA256("WebAppData", botToken)`. Sort params alphabetically, join as `key=value\n`.
- Testnet explorer: `https://testnet.tonscan.org/tx/{txHash}`
- Feed score formula: `(like_count*3 + comment_count*5 + share_count*8 - ((unixepoch()-created_at)/3600.0)*0.5)`
- Subscription duration: 2592000 seconds (30 days)
- Subscription tiers default JSON: `[{"tier":1,"name":"Bronze","price_ton":"2"},{"tier":2,"name":"Silver","price_ton":"5"},{"tier":3,"name":"Gold","price_ton":"10"}]`

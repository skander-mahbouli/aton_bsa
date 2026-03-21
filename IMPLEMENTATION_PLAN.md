# TikTon — Modular Implementation Plan

## Context

TikTon is a TikTok-style Telegram Mini App on the TON blockchain for the BSA "Stablecoins & Payments" Hackathon, AlphaTON Capital track.

Stack: React + TypeScript + Vite (frontend), Node.js + Fastify + SQLite (backend), Tact contracts via Blueprint (smart contracts), Cloudflare R2 (storage), Vercel (frontend deploy), Railway (backend deploy), all TON on testnet.

**How to use this plan**: Each module below is a discrete Claude session. Feed Claude the module prompt + the files it needs to read. Complete them in order. Never skip a module — each one depends on the previous.

---

## Prerequisites (Manual — Developer Must Complete Before Module 1)

**STOP A — Do these before any coding:**
1. Telegram: message @BotFather → `/newbot` → name "TikTon" → copy bot token
2. TON wallet: create in Tonkeeper, switch to testnet, export 24-word mnemonic, get testnet TON from @testgiver_ton_bot
3. TON Center API key: register at toncenter.com, get **testnet** key
4. Confirm: bot token, 24-word mnemonic, TON API key are all ready

**STOP B — Before running backend (Module 7):**
5. Cloudflare R2: create bucket, get endpoint URL, bucket name, access key ID, secret access key

**STOP C — Before deploying frontend (Module 27):**
6. Create 256x256 PNG logo → place at `frontend/public/icon.png`

**STOP D — After full deployment (Module 27):**
7. @BotFather → `/newapp` → set web app URL to Vercel URL
8. Upload 15-20 demo videos through the app

---

## Module Index (implement in order)

| # | Module | What it produces |
|---|--------|-----------------|
| 1 | Repo scaffold | Root package.json, .gitignore, .env.example |
| 2 | Contract: ContentRegistry | Tact contract + deploy script |
| 3 | Contract: TipJar | Tact contract + deploy script |
| 4 | Contract: SubscriptionManager | Tact contract + deploy script |
| 5 | Contract: Jetton Minter (TEP-74) | Standard Jetton implementation |
| 6 | Contract: NFT Collection (TEP-62) | Standard NFT implementation (Tier 2) |
| 7 | Backend scaffold | Fastify server, DB schema, R2 backup, TON client |
| 8 | Backend: Auth | initData validation, JWT middleware, POST /api/auth/telegram |
| 9 | Backend: Video routes | Upload (presign), POST /api/videos, GET /api/videos (feed), GET /api/videos/:id |
| 10 | Backend: Social routes | Like, comment, follow, share, view count |
| 11 | Backend: Payments | Stars invoice creation, Stars payment webhook (Grammy bot) |
| 12 | Backend: TON routes | Token balance check, subscription check, content registration |
| 13 | Backend: Users + Notifications | GET/PATCH user, notifications CRUD |
| 14 | Frontend scaffold | Vite setup, Tailwind, Telegram theme, TonConnect provider, routing |
| 15 | Frontend: Auth + API client | Zustand auth store, axios client, login flow |
| 16 | Frontend: Feed page | Scroll-snap feed, VideoSlide, IntersectionObserver, autoplay |
| 17 | Frontend: Video overlays | Right action bar, bottom info, paid/token-gated overlays |
| 18 | Frontend: Comment sheet | Bottom sheet, nested comments, reply input |
| 19 | Frontend: Tip modal | Stars tab, TON tab, TonConnect sendTransaction |
| 20 | Frontend: Creator profile | Avatar, stats, video grid, follow, subscription tiers, token section |
| 21 | Frontend: Create page (camera) | getUserMedia, MediaRecorder, iOS fallback, thumbnail capture |
| 22 | Frontend: Create page (publish) | Caption form, visibility picker, presigned upload, progress |
| 23 | Frontend: Wallet + Jetton launch | TonConnect connect/disconnect, Jetton deploy form |
| 24 | Frontend: Bottom nav + deep links | BottomNav, startapp parsing, share flow |
| 25 | Tier 2: Explore + Dashboard | Search page, creator dashboard, earnings, content management |
| 26 | Tier 2: NFTs + Notifications + Bookmarks | NFT deploy/mint, notification list, bookmark toggle, star reactions |
| 27 | Deployment | Vercel, Railway, webhook, BotFather Mini App registration |

---

## Module 1 — Repo Scaffold

**Goal**: Set up the monorepo root and the contracts workspace.

**Steps:**
1. Create root `package.json` as npm workspace containing `frontend`, `backend`, `contracts`
2. Create `.gitignore` (node_modules, dist, .env, *.sqlite, *.db)
3. Create `.env.example` with all required variables:
   ```
   BOT_TOKEN=
   BOT_USERNAME=
   MINI_APP_URL=
   S3_ENDPOINT=
   S3_BUCKET=
   S3_ACCESS_KEY=
   S3_SECRET_KEY=
   S3_REGION=auto
   TON_NETWORK=testnet
   TON_API_KEY=
   PLATFORM_WALLET_MNEMONIC=
   JWT_SECRET=
   CONTENT_REGISTRY_ADDRESS=
   TIP_JAR_ADDRESS=
   SUBSCRIPTION_MANAGER_ADDRESS=
   ```
4. Scaffold contracts workspace: `npm create ton@latest contracts -- --type tact-empty`
5. Scaffold frontend: `npm create vite@latest frontend -- --template react-ts`
6. Create `backend/` directory with `package.json` (name: tikton-backend, version: 1.0.0)

**Verify**: `npm install` from root succeeds, workspace links are correct.

---

## Module 2 — Contract: ContentRegistry

**Goal**: Write and deploy the ContentRegistry smart contract on TON testnet.

**Context**: Stores a SHA-256 hash of each video with the creator's address and video ID. Enforces uniqueness — same hash cannot be registered twice. Deployed once; address goes into `.env`.

**Steps:**
1. Create `contracts/contracts/ContentRegistry.tact`:
   - State: `owner: Address`, `registrations: map<String, Address>`
   - `init(owner: Address)`
   - `receive(msg: RegisterContent)`: require hash not already registered, store hash to sender, emit event
   - `get fun getCreator(contentHash: String): Address?`
   - Message types: `RegisterContent { videoId: Int as uint64; contentHash: String }`, `RegisterContentEvent`
2. Blueprint auto-generates `contracts/wrappers/ContentRegistry.ts` after compile — verify it exists
3. Create `contracts/scripts/deployContentRegistry.ts`:
   - Parse `PLATFORM_WALLET_ADDRESS` from env, deploy via Blueprint NetworkProvider, print address
4. Compile: `npx blueprint build ContentRegistry`
5. Deploy: `npx blueprint run deployContentRegistry --testnet`
6. Copy address to `.env` as `CONTENT_REGISTRY_ADDRESS`

**Verify**: Address printed, visible on testnet.tonscan.org

---

## Module 3 — Contract: TipJar

**Goal**: Write and deploy the TipJar smart contract on TON testnet.

**Context**: Receives TON tips, splits 95% to creator, 5% to platform. Creator address passed per-tip as a message field.

**Steps:**
1. Create `contracts/contracts/TipJar.tact`:
   - State: `platformWallet: Address`, `platformFeeBps: Int as uint16` (500 = 5%)
   - `init(platformWallet: Address, platformFeeBps: Int)`
   - `receive(msg: TipCreator)`:
     - Require `context().value > ton("0.05")`
     - `platformFee = amount * feeBps / 10000`, `creatorAmount = amount - platformFee - ton("0.02")`
     - Send creatorAmount to `msg.creatorAddress`, send platformFee to `platformWallet`
   - Message: `TipCreator { creatorAddress: Address; videoId: Int as uint64 }`
2. Create `contracts/scripts/deployTipJar.ts` (platform wallet + 500 bps)
3. Compile and deploy to testnet
4. Copy address to `.env` as `TIP_JAR_ADDRESS`

**Verify**: Contract deployed and visible on testnet explorer.

---

## Module 4 — Contract: SubscriptionManager

**Goal**: Write and deploy the SubscriptionManager smart contract on TON testnet.

**Context**: Fan sends TON, contract records 30-day expiry and accumulates creator balance. Creator withdraws anytime. Platform takes 10%.

**Steps:**
1. Create `contracts/contracts/SubscriptionManager.tact`:
   - State: `platformWallet`, `platformFeeBps` (1000), `subscriptions: map<Int, SubscriptionRecord>`, `creatorBalances: map<Address, Int>`
   - Struct: `SubscriptionRecord { subscriber: Address; tier: Int as uint8; expiresAt: Int as uint64 }`
   - `receive(msg: Subscribe)`:
     - Require `context().value > ton("0.1")`
     - key = hash of (subscriber ++ creatorAddress cell)
     - Store record with `expiresAt = now() + 2592000`, add creatorAmount to balance, send platform fee
   - `receive(msg: Withdraw)`: require balance > ton("0.05"), zero balance, send to sender
   - `get fun isSubscribed(subscriber: Address, creator: Address): Bool`
   - `get fun getSubscription(subscriber: Address, creator: Address): SubscriptionRecord?`
   - Messages: `Subscribe { creatorAddress: Address; tier: Int as uint8 }`, `Withdraw {}`
2. Create deploy script, compile, deploy, copy address to `.env`

**Verify**: `isSubscribed` getter with dummy addresses returns false.

---

## Module 5 — Contract: Jetton Minter (TEP-74)

**Goal**: Add standard TEP-74 Jetton Minter/Wallet contracts and TypeScript wrappers for frontend use.

**Context**: Creators deploy their own Jetton from the frontend via TonConnect. We only need the compiled wrappers to build StateInit client-side.

**Steps:**
1. Check if `@ton-community/jetton` has ready-made Tact wrappers. If not:
   - Create `contracts/contracts/JettonMinter.tact` + `JettonWallet.tact` per TEP-74
   - Minter: state (`totalSupply`, `owner`, `content`, `walletCode`), messages (Mint, ChangeOwner), getters (`get_wallet_address`, `get_jetton_data`)
   - Wallet: handles Transfer, InternalTransfer, Burn
2. Create `contracts/wrappers/JettonMinter.ts` with static helpers:
   - `fromInit(owner, contentCell)`, `buildDeployPayload()`, `buildMetadataCell(name, symbol, imageUrl)`
3. Compile contracts
4. Copy wrappers to `frontend/src/contracts/`

**Verify**: `npx blueprint build JettonMinter` succeeds. Wrapper exports correct TypeScript.

---

## Module 6 — Contract: NFT Collection (TEP-62, Tier 2)

**Goal**: Standard TEP-62 NFT Collection + Item contracts and wrappers.

**Steps:**
1. Create `contracts/contracts/NftCollection.tact`:
   - State: `owner`, `nextItemIndex`, `collectionContent`, `mintPrice`, `maxSupply`
   - `receive(msg: Mint)`: require payment >= mintPrice, deploy NftItem, increment index
   - `get fun get_collection_data()`, `get fun get_nft_address_by_index(index: Int): Address`
2. Create `contracts/contracts/NftItem.tact`: TEP-62 compliant with `get fun get_nft_data()`
3. Create `contracts/wrappers/NftCollection.ts` with build helpers
4. Compile, copy wrappers to `frontend/src/contracts/`

**Verify**: Compiles cleanly. Wrapper types export correctly.

---

## Module 7 — Backend: Scaffold + DB + R2 Backup + TON Client

**Goal**: Full backend foundation — Fastify server, SQLite database, R2 backup, TON client. No routes yet.

**Steps:**
1. Install dependencies:
   ```bash
   cd backend
   npm install fastify @fastify/cors @fastify/multipart @fastify/jwt
   npm install better-sqlite3 grammy
   npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner
   npm install @ton/ton @ton/crypto dotenv
   npm install -D typescript @types/node @types/better-sqlite3 tsx
   ```
2. Create `backend/tsconfig.json` (target ES2022, module NodeNext, strict true)
3. Create `backend/src/index.ts`:
   - Load dotenv, call `restoreDbFromR2()`, then `initDb()`, then start Fastify
   - Register `@fastify/cors` with Vercel origin, set `setInterval(backupDbToR2, 120_000)`
   - Listen on `process.env.PORT || 3001`
4. Create `backend/src/db/schema.ts` with `initDb(dbPath)` running all `CREATE TABLE IF NOT EXISTS`:
   ```
   users, videos, likes, comments, follows, video_unlocks, tips,
   subscriptions, notifications, bookmarks, messages, nft_collections, video_hashtags
   ```
   Full column definitions:
   ```
   users(id PK, telegram_id UNIQUE, name, username, photo_url, bio, is_creator DEFAULT 0,
         wallet_address, stars_balance DEFAULT 0, dm_price DEFAULT 0, jetton_address,
         jetton_name, jetton_symbol, subscription_tiers DEFAULT '[]', created_at)
   videos(id PK, creator_id FK, video_url, thumbnail_url, caption, hashtags DEFAULT '[]',
          visibility DEFAULT 'public', star_price DEFAULT 0, required_token, content_hash,
          registration_tx, view_count DEFAULT 0, like_count DEFAULT 0, comment_count DEFAULT 0,
          share_count DEFAULT 0, status DEFAULT 'active', allow_comments DEFAULT 1, created_at)
   likes(user_id FK, video_id FK, created_at, PK(user_id,video_id))
   comments(id PK, user_id FK, video_id FK, parent_id FK, text, like_count DEFAULT 0, created_at)
   follows(follower_id FK, following_id FK, created_at, PK(follower_id,following_id))
   video_unlocks(user_id FK, video_id FK, amount_paid DEFAULT 0, created_at, PK(user_id,video_id))
   tips(id PK, tipper_id FK, creator_id FK, video_id, amount, currency, tx_hash, created_at)
   subscriptions(id PK, subscriber_id FK, creator_id FK, tier, ton_amount, tx_hash, expires_at, created_at)
   notifications(id PK, user_id FK, type, data_json DEFAULT '{}', is_read DEFAULT 0, created_at)
   bookmarks(user_id FK, video_id FK, created_at, PK(user_id,video_id))
   messages(id PK, sender_id FK, receiver_id FK, text, stars_paid DEFAULT 0, created_at)
   nft_collections(id PK, creator_id FK, name, image_url, contract_address, max_supply, mint_price_ton, minted_count DEFAULT 0, created_at)
   video_hashtags(video_id FK, hashtag, created_at)
   ```
5. Create `backend/src/db/backup.ts`:
   - `s3Client` from env vars (S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY)
   - `restoreDbFromR2(dbPath)`: GetObject "backup.sqlite" → write to disk; if NoSuchKey skip
   - `backupDbToR2(dbPath)`: read file → PutObject "backup.sqlite"
6. Create `backend/src/ton/client.ts`:
   - `tonClient = new TonClient({ endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC", apiKey })`
   - `getPlatformWallet()`: `mnemonicToPrivateKey(mnemonic.split(" "))` → WalletContractV4
7. Add package.json scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist/index.js)

**Verify**: `npm run dev` starts, DB file created, no errors.

---

## Module 8 — Backend: Auth

**Goal**: Telegram initData HMAC validation and JWT auth middleware.

**Steps:**
1. Create `backend/src/auth/validateInitData.ts`:
   - Parse URLSearchParams, remove `hash`, sort alphabetically, join `key=value\n`
   - `secretKey = HMAC-SHA256("WebAppData", botToken)`
   - Compare `HMAC-SHA256(secretKey, dataCheckString)` to hash
   - Return parsed params or null
2. Create `backend/src/auth/middleware.ts`: Fastify preHandler that reads Bearer token, verifies JWT, attaches `{ userId, telegramId }` to `request.user`, returns 401 if invalid
3. Create `backend/src/routes/auth.ts`:
   - `POST /api/auth/telegram` — validate initData, parse `user` JSON, upsert user in DB
   - Sign JWT `{ userId, telegramId }` expires 7 days
   - Return `{ token, user }`
4. Register route in `index.ts`

**Verify**: Valid initData returns JWT. Garbage returns 401.

---

## Module 9 — Backend: Video Routes

**Goal**: Presigned R2 upload, video record creation, and feed API.

**Steps:**
1. Create `backend/src/routes/storage.ts`:
   - `POST /api/upload/presign` (auth required)
   - Returns two presigned PUT URLs (10 min expiry) for video + thumbnail
2. Create `backend/src/routes/videos.ts`:
   - `POST /api/videos` (auth): extract hashtags, insert video, trigger async on-chain registration if requested
   - `GET /api/videos?feed=foryou|following|trending&page=&limit=` (auth optional):
     - foryou: `(like_count*3 + comment_count*5 + share_count*8 - ((unixepoch()-created_at)/3600.0)*0.5) AS score ORDER BY score DESC`
     - following: filter by `creator_id IN (SELECT following_id FROM follows WHERE follower_id=?)` ORDER BY created_at DESC
     - trending: foryou formula + `WHERE created_at > unixepoch()-86400`
     - Include creator JOIN, `isLiked`/`isUnlocked` booleans for auth users
   - `GET /api/videos/:id`: single video + creator + user flags
   - `POST /api/videos/:id/view`: increment view_count
3. Create `backend/src/ton/register.ts`: send `RegisterContent` tx from platform wallet, return tx hash
4. Register routes in `index.ts`

**Verify**: Presign → upload to R2 → POST video → GET feed returns the video.

---

## Module 10 — Backend: Social Routes

**Goal**: Likes, comments, follows, shares.

**Steps:**
1. Create `backend/src/routes/social.ts`:
   - `POST /api/videos/:id/like` (auth): toggle like, update like_count, create notification, return `{ liked, likeCount }`
   - `GET /api/videos/:id/comments`: top-level + 1-level replies with commenter info
   - `POST /api/videos/:id/comments` (auth): insert, increment comment_count, create notification, return comment
   - `POST /api/users/:id/follow` (auth): toggle follow, create notification, return `{ following }`
   - `POST /api/videos/:id/share`: increment share_count, return `{ shareCount }`
2. Register routes in `index.ts`

**Verify**: Like/unlike toggles correctly. Replies nest under parent. Follow works.

---

## Module 11 — Backend: Payments (Stars + Grammy Bot)

**Goal**: Stars invoice creation and payment handling.

**Steps:**
1. Create `backend/src/bot/index.ts`:
   - Grammy `Bot`, `/start` command with Mini App button, `pre_checkout_query` always approves
   - `successful_payment` handler: parse payload, record tip or unlock in DB, update creator `stars_balance`, create notification
2. Create `backend/src/routes/payments.ts`:
   - `POST /api/payments/stars/invoice` (auth): call `bot.api.createInvoiceLink(...)` with `currency: "XTR"`, `provider_token: ""`, return `{ invoiceUrl }`
3. In `index.ts`: `POST /bot-webhook` route → `bot.handleUpdate(req.body)`. After start: `bot.api.setWebhook(url)`
4. Register payments route

**Stars invoice params**: `provider_token` MUST be `""`, currency MUST be `"XTR"`, amounts are integers (50 = 50 Stars).

**Verify**: Invoice endpoint returns Telegram URL. Bot `/start` shows Mini App button.

---

## Module 12 — Backend: TON Routes

**Goal**: Jetton balance check, subscription status check, subscription recording.

**Steps:**
1. Create `backend/src/ton/checkBalance.ts`:
   - `checkJettonBalance(walletAddr, minterAddr): Promise<bigint>`
   - Step 1: `tonClient.runMethod(minterAddr, "get_wallet_address", [addrSlice])` → jetton wallet address
   - Step 2: `tonClient.runMethod(jettonWalletAddr, "get_wallet_data")` → parse stack[0] as balance
   - If contract not deployed (throws): return `0n`
2. Create `backend/src/routes/ton.ts`:
   - `GET /api/ton/check-token-access?walletAddress=&jettonAddress=&minBalance=`: return `{ hasAccess, balance }`
   - `GET /api/subscriptions/check?subscriberWallet=&creatorId=`: call `isSubscribed` getter + DB fallback, return `{ isSubscribed, expiresAt }`
   - `POST /api/subscriptions/record` (auth): insert subscription row with `expires_at = unixepoch()+2592000`
3. Register routes in `index.ts`

**Verify**: Zero-balance wallet returns `{ hasAccess: false }`.

---

## Module 13 — Backend: Users + Notifications

**Goal**: User profile endpoints and notification CRUD.

**Steps:**
1. Create `backend/src/routes/users.ts`:
   - `GET /api/users/me` (auth): return user record
   - `PATCH /api/users/me` (auth): update any subset of profile fields, return updated user
   - `POST /api/users/me/creator` (auth): set `is_creator = 1`
   - `GET /api/users/:id`: public profile + followerCount, followingCount, videoCount, totalLikes, `isFollowing` if auth
   - `GET /api/users/:id/videos?page=`: paginated videos with `isLiked`/`isUnlocked`
   - `GET /api/users/me/liked` (auth): liked videos
2. Create `backend/src/routes/notifications.ts`:
   - `GET /api/notifications` (auth): 50 most recent with actor info, return `{ notifications, unreadCount }`
   - `PATCH /api/notifications/read` (auth): mark all read
3. Create stub `backend/src/routes/search.ts`: `GET /api/search` returns `{ users:[], videos:[], hashtags:[] }`
4. Register all routes in `index.ts`

**Verify**: PATCH /users/me updates. Notifications return array.

---

## Module 14 — Frontend: Scaffold + Telegram Theme + Routing

**Goal**: Frontend project setup with Telegram theme, TonConnect, and routing shell.

**Steps:**
1. Install dependencies:
   ```bash
   cd frontend
   npm install @twa-dev/sdk @tonconnect/ui-react zustand framer-motion
   npm install tailwindcss @tailwindcss/vite react-router-dom axios
   npm install @ton/ton @ton/crypto
   ```
2. `vite.config.ts`: add `@tailwindcss/vite` plugin
3. `index.css`: `@import "tailwindcss";`
4. `main.tsx`: `WebApp.ready()`, `WebApp.expand()`, map 6 theme params to CSS vars with dark fallbacks:
   `--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-link`, `--tg-button`, `--tg-secondary-bg`
5. `App.tsx`: `TonConnectUIProvider` + `BrowserRouter` with 5 routes (`/`, `/create`, `/profile/:userId?`, `/explore`, `/inbox`), `BottomNav` below routes, `useEffect` calling `authStore.login()` + deep link parsing
6. Placeholder pages for all 5 routes
7. `BottomNav`: 5 items (Home, Explore, Create+, Inbox, Profile), active highlight
8. `frontend/public/tonconnect-manifest.json`: placeholder `YOUR_URL` (update after deploy)
9. `frontend/.env.example`: `VITE_API_URL`, `VITE_TIP_JAR_ADDRESS`, `VITE_SUBSCRIPTION_MANAGER_ADDRESS`, `VITE_BOT_USERNAME`

**Verify**: `npm run dev` renders bottom nav, theme CSS vars set, no TS errors.

---

## Module 15 — Frontend: Auth + API Client

**Goal**: Zustand auth store and axios API client.

**Steps:**
1. `frontend/src/lib/api.ts`: axios instance with `baseURL = VITE_API_URL`, request interceptor attaching Bearer token, response interceptor clearing auth on 401
2. `frontend/src/store/authStore.ts`:
   - State: `user`, `token`, `isLoading`
   - `login()`: POST `/api/auth/telegram` with `WebApp.initData`, store token + user, set axios header
   - Dev fallback: mock user when `WebApp.initData` is empty
3. `frontend/src/store/uiStore.ts`: `showNav: boolean`, `soundEnabled: boolean`
4. `frontend/src/types/index.ts`: interfaces for User, Video, Comment, Notification, Subscription
5. `App.tsx`: show loading spinner while `isLoading`

**Verify**: Auth fires on load, user stored in Zustand.

---

## Module 16 — Frontend: Feed Page

**Goal**: Full-screen scroll-snap video feed with autoplay, tabs, and infinite scroll.

**Steps:**
1. `frontend/src/pages/FeedPage.tsx`:
   - Tabs: Following | For You | Trending (fixed at top)
   - Scroll container: `h-screen overflow-y-scroll` with `scroll-snap-type: y mandatory`
   - Fetch on mount + tab switch: `GET /api/videos?feed=...&page=0&limit=20`
   - Infinite scroll: `IntersectionObserver` on sentinel at bottom → append next page
   - Empty state: "No videos yet — be the first to post!" + Create Video button
2. `frontend/src/components/VideoSlide.tsx`:
   - `<video>` with `loop playsInline muted={!soundEnabled} className="h-screen w-full object-cover"`
   - `useEffect` on `isActive`: play true → play, false → pause + reset
   - First tap: `setSoundEnabled(true)`, unmute
   - Single tap (250ms debounce): toggle play/pause with pause icon flash
   - Double tap: `onLike()` + `HeartBurst` at (x, y)
   - View tracking: `setTimeout(3000)` on isActive, cancel on inactive
3. `IntersectionObserver` (threshold 0.8) determines `isActive` per slide
4. `HeartBurst`: framer-motion heart scales 0→1.5→0 at tap position

**Verify**: Snappy scroll. Autoplay. Pause icon on tap. Heart burst on double-tap.

---

## Module 17 — Frontend: Video Overlays

**Goal**: Right action bar, bottom info overlay, paid overlay, token-gated overlay.

**Steps:**
1. `RightActionBar.tsx`: `absolute right-3 bottom-24` — avatar (→ profile), like (heart, filled/outline), comment, share, tip (star). Optimistic like toggle.
2. `BottomVideoInfo.tsx`: `absolute bottom-0 left-0 right-16` — creator name (→ profile), caption (`line-clamp-2` + "more"), `#hashtag` words in `var(--tg-link)`, "Verified on TON ✓" badge if `registrationTx` (→ tonscan)
3. `PaidContentOverlay.tsx`: `backdrop-filter: blur(20px)` + lock icon + "Unlock for X Stars" button → Stars invoice → `WebApp.openInvoice` → on 'paid': mark unlocked
4. `TokenGatedOverlay.tsx`: no wallet → TonConnectButton; wallet but no access → "You need X $SYMBOL" + "Buy Tokens" link
5. Wire into `VideoSlide` conditionally

**Verify**: Paid video blurs. Unlock flow works. Verified badge links to explorer.

---

## Module 18 — Frontend: Comment Sheet

**Goal**: Slide-up bottom sheet with threaded comments and reply input.

**Steps:**
1. `CommentSheet.tsx`:
   - framer-motion `initial={{ y:"100%" }}` → `animate={{ y:"40%" }}`, backdrop dim
   - 60% screen height, top rounded corners, drag handle
   - Fetch `GET /api/videos/:id/comments` on mount
   - Comment item: avatar (32px), bold username, text, `timeAgo()`, like button
   - Reply: tap "Reply" → prefill `@username ` in input, render indented
   - Input bar pinned to bottom, rises above keyboard via `visualViewport.resize`
   - Send: optimistic append
2. `timeAgo(ts: number): string` utility function
3. Wire: comment icon → `setShowComments(true)`

**Verify**: Slides up. Comments display. Replies indent. Input rises above keyboard.

---

## Module 19 — Frontend: Tip Modal

**Goal**: Bottom sheet with Stars and TON tip tabs.

**Steps:**
1. `TipModal.tsx`: framer-motion slide-up sheet, two tabs
   - Stars: presets [1,5,10,50,100] + Custom → `POST /api/payments/stars/invoice` → `WebApp.openInvoice(url, cb)` → on 'paid': `FloatingReaction`
   - TON: if no wallet → TonConnectButton; if connected → presets [0.1,0.5,1,5,10] + Custom → `tonConnectUI.sendTransaction()` to TipJar with encoded `TipCreator` cell
2. `FloatingReaction`: framer-motion text floats up and fades from bottom center

**TipCreator cell**: `beginCell().storeUint(opcode,32).storeAddress(creatorAddr).storeUint(videoId,64).endCell().toBoc().toString('base64')`

**Verify**: Stars opens Telegram payment. TON opens wallet. Animations play.

---

## Module 20 — Frontend: Creator Profile Page

**Goal**: Full profile with stats, video grid, follow, subscribe, token sections.

**Steps:**
1. `ProfilePage.tsx` (`/profile/:userId?`):
   - Fetch `GET /api/users/:id` + `GET /api/users/:id/videos`
   - Header: avatar, name, wallet indicator (green dot + truncated addr), bio, stats row
   - Own profile: Edit Profile button, Become a Creator button
   - Other profile: Follow/Following toggle, Subscribe button, Buy $SYMBOL button
   - 3-column video grid (9:16 thumbnails), paid = star badge, gated = lock badge
   - Videos | Liked tabs
   - Creator sections: subscription tiers + token card
   - "Launch Your Token" (own creator, no token)
2. Edit Profile sheet: name + bio → `PATCH /api/users/me`
3. Subscribe: TonConnect tx to SubscriptionManager → `POST /api/subscriptions/record`
4. Buy token: TonConnect tx to Jetton Minter

**Verify**: Stats correct. Follow toggles. Subscription tiers show.

---

## Module 21 — Frontend: Create Page (Camera)

**Goal**: Camera screen with recording, iOS fallback, thumbnail capture.

**Steps:**
1. Camera screen in `CreatePage.tsx`:
   - Try `getUserMedia({ video: { facingMode:'user' }, audio: true })`
   - Success: live `<video autoPlay playsInline muted>` preview
   - Fail: "Record Video" button → `<input type="file" accept="video/*" capture="camcorder">`
   - Always: "Upload from Gallery" → `<input type="file" accept="video/*">`
   - Flip camera: restart stream with opposite facingMode
   - Record button: pulsing ring animation, `MediaRecorder` collecting chunks
   - Timer: counts to 3:00, auto-stop at 180s
2. Post-record preview with "Use this" / "Retake"
3. File validation: size > 100MB or duration > 180s → show error
4. Thumbnail: `captureFirstFrame(videoEl)` via canvas → JPEG blob
5. Store `{ videoBlob, thumbnailBlob }` → navigate to Publish screen

**Verify**: Camera preview on Android. iOS file picker fallback. Timer stops at 3:00.

---

## Module 22 — Frontend: Create Page (Publish)

**Goal**: Publish form with visibility picker, presigned upload, progress tracking.

**Steps:**
1. Publish screen:
   - Caption textarea (500 chars, counter, `#hashtag` highlights)
   - Visibility segmented control: Public | Subscribers Only | Token-Gated (shows jetton addr + min balance) | Paid (shows Stars price)
   - Register on TON toggle (default ON), Allow comments toggle (default ON)
2. On "Post":
   - `POST /api/upload/presign` → get presigned URLs
   - `XMLHttpRequest` video upload with `onprogress` → progress bar
   - `fetch` thumbnail upload
   - `POST /api/videos` with keys + form data
   - "Posted!" toast → navigate to `/`, refresh feed
3. Cancel → back to Camera screen

**Verify**: Progress bar fills. Video in feed. All visibility types persist.

---

## Module 23 — Frontend: Wallet + Jetton Launch

**Goal**: TonConnect wallet integration and Jetton token launch form.

**Steps:**
1. `WalletSection.tsx`: `TonConnectButton` + useEffect watching wallet → `PATCH /api/users/me` with walletAddress on connect
2. `LaunchTokenModal.tsx`:
   - Fields: Name, Symbol (max 8 chars), Total Supply, Price TON, Creator Allocation %, Icon (file upload)
   - On submit: upload icon → build metadata cell → compute minter address → TonConnect sendTransaction with StateInit → poll/callback → `PATCH /api/users/me` with jetton info
3. Wire: "Launch Your Token" → LaunchTokenModal on profile
4. "Buy $SYMBOL": TonConnect tx to Jetton Minter

**Verify**: Form deploys token via TonConnect. Jetton address saved to profile.

---

## Module 24 — Frontend: Bottom Nav + Deep Links + Share

**Goal**: Working nav, deep link routing, Telegram share.

**Steps:**
1. Finalize `BottomNav.tsx`: 5 items, `useLocation()` for active highlight, hidden when `showNav=false`
2. Deep links in `App.tsx`:
   - `start_param` starting with `v_` → `navigate('/?video='+id)`
   - `start_param` starting with `u_` → `navigate('/profile/'+id)`
   - FeedPage reads `?video=ID` → scrolls to matching video after load
3. `shareVideo(video)`: `WebApp.openTelegramLink` with Telegram share URL + `api.post('/videos/:id/share')`
4. FeedPage: `setShowNav(false)` on mount, `setShowNav(true)` on unmount
5. Wallet nudge banner: after 3rd video viewed, show dismissible "Connect wallet to tip" banner

**Verify**: Nav active state correct. Share opens Telegram. Deep link navigates to video.

---

## Module 25 — Tier 2: Explore + Creator Dashboard

**Goal**: Search page and creator analytics dashboard.

**Steps:**
1. Backend `search.ts`: LIKE queries on users/videos, trending hashtags from `video_hashtags`
2. `ExplorePage.tsx`: debounced search bar, trending hashtag pills, creator + video results
3. Backend dashboard routes: `GET /api/dashboard` (aggregated stats), `DELETE /api/videos/:id`, `PATCH /api/videos/:id`
4. `DashboardPage.tsx`: stats cards, earnings breakdown, top videos, content grid with edit/delete, "Withdraw TON" button
5. Link Dashboard from creator profile

**Verify**: Search finds content. Dashboard stats are correct aggregates.

---

## Module 26 — Tier 2: NFTs + Notifications + Bookmarks + Star Reactions

**Goal**: NFT deploy/mint, notifications, bookmarks, star reactions.

**NFTs:**
1. Backend: `POST /api/nft-collections`, `GET /api/users/:id/nft-collections`
2. Frontend: NFT deploy form → TonConnect tx using Module 6 wrappers; "Mint" button on collection

**Notifications:**
3. `InboxPage.tsx`: fetch on mount + 30s poll, notification items, mark read, empty state

**Bookmarks:**
4. Bookmark icon in `RightActionBar` → toggle `POST /api/videos/:id/bookmark`
5. "Saved" tab on own profile

**Star Reactions:**
6. Long-press like button (500ms) → reaction picker (fire/diamond/rocket/crown)
7. Each → Stars invoice → on payment: framer-motion emoji floats up screen

**Verify**: Bookmarks save. Notifications load. NFT deploys. Reactions animate.

---

## Module 27 — Deployment

**Goal**: Deploy to Vercel + Railway, register Telegram Mini App.

**Steps:**
1. **Frontend → Vercel**: `cd frontend && npx vercel --prod`. Set env vars. Update `tonconnect-manifest.json` with real URL, redeploy.
2. **Backend → Railway**: push to GitHub, connect Railway, set root to `backend/`, set all env vars, add `Procfile: web: node dist/index.js`
3. **Bot webhook**: `curl "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url=https://your-backend.railway.app/bot-webhook"`
4. **Mini App**: @BotFather → `/newapp` → set Vercel URL
5. **End-to-end test**: run full checklist below in Telegram
6. **Demo content**: upload 15-20 videos (mix public, paid, token-gated)

**Verify**: `https://t.me/YourBotUsername/app` opens — all Tier 1 items pass.

---

## End-to-End Verification Checklist

### Tier 1 (all must pass before demo)
- [ ] App opens in Telegram, no sign-up, lands on feed
- [ ] Telegram dark/light theme reflected
- [ ] Feed autoplays (muted first, tap → sound on)
- [ ] Swipe up/down navigates videos
- [ ] Double-tap → heart burst + like increments
- [ ] Following / For You / Trending tabs all load
- [ ] "+" → camera or file picker (iOS fallback seamless)
- [ ] Record/upload → publish → appears in feed
- [ ] Caption hashtags parsed and colored
- [ ] Creator profile loads with stats and grid
- [ ] Follow/Unfollow toggles
- [ ] Comment sheet opens, posts, replies work
- [ ] Share opens Telegram share dialog
- [ ] Stars tip → Telegram payment UI → success animation
- [ ] Paid video: blur → unlock → plays
- [ ] TonConnect: wallet connects, address shown
- [ ] Toncoin tip → TonConnect → TipJar tx confirmed
- [ ] "Verified on TON" badge appears after upload
- [ ] Creator launches Jetton → token visible on profile
- [ ] Token-gated: 0 balance = blocked; after buying = accessible
- [ ] Subscribe via TonConnect → subscriber content unlocked

### Tier 2 (after Tier 1)
- [ ] Search returns creators and videos
- [ ] Creator dashboard shows stats, withdrawal works
- [ ] NFT collection deploys, fans can mint
- [ ] Star reactions animate
- [ ] Notifications populate
- [ ] Bookmarks save and show in Saved tab

---

## Key Technical Notes

1. **Stars currency**: Always `"XTR"`, `provider_token: ""` in `createInvoiceLink`
2. **Jetton balance**: Two-step — `get_wallet_address` on Minter → `get_wallet_data` on Wallet. Non-existent wallet = 0 balance (not an error).
3. **initData validation**: `secretKey = HMAC-SHA256("WebAppData", botToken)`. Sort params alphabetically, join `key=value` with `\n`.
4. **TonConnect manifest**: Must be at `/tonconnect-manifest.json` on same origin as frontend. Update with real URL after Vercel deploy.
5. **No localhost for Telegram**: Use ngrok or Vercel to test inside Telegram.
6. **SQLite backup**: Restore from R2 on startup, backup every 2 minutes via `setInterval`.
7. **CORS**: Configure from day 1 with Vercel domain in `@fastify/cors`.
8. **Autoplay mute**: First video always starts muted. Unmute after first user interaction.
9. **iOS camera fallback**: Silent fallback to `<input type="file" accept="video/*" capture="camcorder">` if `getUserMedia` throws.
10. **Testnet explorer**: `https://testnet.tonscan.org/tx/{txHash}`
11. **Platform wallet**: Server-side only. Never expose mnemonic to frontend.
12. **Fee splits**: TON/Stars tips 95/5, paid unlocks 92/8, subscriptions 90/10.
13. **Scroll snap**: `scroll-snap-type: y mandatory` on container, `scroll-snap-align: start` per slide.
14. **Subscription tiers JSON**: `[{tier:1,name:"Bronze",price_ton:"2"},{tier:2,name:"Silver",price_ton:"5"},{tier:3,name:"Gold",price_ton:"10"}]`

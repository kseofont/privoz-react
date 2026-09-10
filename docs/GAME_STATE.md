**# Privoz - Current Project State**

Updated: 2026-09-10

**## Project**

"Привоз" is a multiplayer board-game prototype built with React + PeerJS.

Production:

https\://privoz.kotucheniy.com.ua/

The project is currently playable and deployed.

The main architectural direction is gradual migration from legacy client-side gameState mutations to a host-authoritative architecture.

Target flow:

UI

→ ACTION

→ HOST

→ validation / game rules

→ REDUCER

→ authoritative gameState

→ broadcast

→ clients

Do not mix unrelated gameplay refactors into one change.

Preferred workflow:

small vertical slice

→ test

→ npm run build

→ git diff --check

→ commit

→ next slice

**# Current Git state**

The current large development branch being closed is:

game-core-refactor

After this state document is committed, game-core-refactor should be merged into main.

The next development branch should be:

bot-player

**# Networking / game-core architecture**

PeerJS lifecycle has been stabilized.

Important architecture files:

src/game/actions.js

src/game/reducer.js

src/game/hostActionHandler.js

src/game/phases.js

Explicit game phases exist.

SELECT\_TRADER has already been converted to the host-authoritative flow:

client UI

→ gameAction

→ host

→ handleHostGameAction()

→ reducer

→ authoritative state

→ broadcast

The shared host gameplay listener currently lives in:

src/components/Menu.js

This is intentional for now because Menu exists across the gameplay pages and keeps the host listener alive while navigating between pages.

Some gameplay flows are still legacy, but the main per-turn bot path is now host-authoritative.

Currently migrated through the shared gameAction flow:

- SELECT\_TRADER;
- BUY\_PRODUCT;
- PLACE\_TRADER;
- END\_TURN.

END\_TURN intentionally preserves the current prototype semantics: it only advances currentTurnUserId to the next player and clears waitingForHost. It does NOT implicitly change round or phase.

Event resolution, round-end processing and other remaining gameplay flows must still be inspected individually before assuming they are host-authoritative.

**# Feedback / Debug Reporting**

A complete feedback/debug-reporting vertical slice has been implemented and deployed.

Main frontend files:

src/components/FeedbackButton.js

src/components/FeedbackModal.js

src/feedback/buildFeedbackReport.js

src/feedback/copyFeedbackReport.js

src/feedback/sendFeedback.js

src/feedback/appVersion.js

Feedback is available from Menu.

The user can:

1\. open Feedback;

2\. describe a bug or suggestion;

3\. send a diagnostic report;

4\. copy the technical report as a fallback.

The diagnostic snapshot is intentionally compact and whitelist-based.

It does NOT serialize PeerJS Peer/DataConnection objects or blindly dump browser storage.

Useful diagnostic information includes:

\- feedback ID;

\- timestamp;

\- player/user ID;

\- host/client role;

\- round;

\- phase;

\- currentTurnUserId;

\- players;

\- balances;

\- products;

\- traders;

\- trader locations;

\- relevant event-card state;

\- eventResultLog / eventResultNonce;

\- lastAction / lastEvent when available;

\- limited coins log;

\- network summary;

\- browser/runtime information;

\- app version;

\- Git commit;

\- state keys;

\- state fingerprint.

The snapshot is captured when the feedback modal is opened so later game-state changes do not silently replace the state associated with the reported bug.

**# Feedback backend**

Backend files:

api/feedback.php

api/feedback-lib.php

api/feedback-admin.php

Local admin secret config:

api/feedback-admin-config.php

This file is intentionally ignored by Git.

Example config:

api/feedback-admin-config.example.php

Production feedback flow:

React

→ POST /api/feedback.php

→ PHP

→ persistent JSON storage

→ admin viewer

Reports are kept as individual JSON files.

The earlier 3-day automatic deletion policy was removed.

Current behavior:

ALL saved reports are retained.

The admin page lists reports from newest to oldest.

Admin viewer:

https\://privoz.kotucheniy.com.ua/api/feedback-admin.php

It is protected by the configured password.

A "View reports" / localized equivalent button is available in Menu below the Feedback button.

The admin viewer and JSON reports can be inspected directly in the browser.

Email notification has NOT been implemented yet.

**# Feedback local development**

Local feedback API runs separately from React:

PRIVOZ\_FEEDBACK\_DIR=/tmp/privoz-feedback \\

php -S localhost:8082 -t .

React local environment uses:

.env.local

with:

REACT\_APP\_FEEDBACK\_API\_URL=http\://localhost:8082/api/feedback.php

.env.local is ignored by Git.

IMPORTANT:

Never build/deploy production while .env.local is active, otherwise CRA can embed localhost:8082 in the production JavaScript bundle.

Safe production procedure:

remove .env.local

unset REACT\_APP\_FEEDBACK\_API\_URL

npm run build

Then verify:

grep -R "localhost:8082" build/static/js \\

 && echo "ERROR: localhost found" \\

 || echo "OK: production build clean"

Production must use:

/api/feedback.php

**# Build/version information**

package.json now runs the build through:

scripts/build.js

The build wrapper injects application/build metadata including Git commit/version information into the React build.

npm run build currently succeeds.

There are existing ESLint warnings in legacy files. They are not part of the feedback implementation unless a new change introduces additional warnings.

**# Deployment**

React is still deployed as a CRA static build using:

npm run deploy

The existing deploy command uploads build/ via FTP.

Important:

api/\\\*.php is NOT part of CRA build/.

PHP feedback backend files therefore need to be uploaded separately when they change.

Production API path:

https\://privoz.kotucheniy.com.ua/api/feedback.php

Production admin:

https\://privoz.kotucheniy.com.ua/api/feedback-admin.php

**# Multiplayer testing flow**

The start screen contains localized buttons for:

Create Game

Join Game

Languages currently supported:

en

ua

ru

es

CreateServerPage now uses:

window\.location.origin

for invite URLs.

Therefore the same code generates correct URLs for both:

http\://localhost:3000

and:

https\://privoz.kotucheniy.com.ua

There should be no hardcoded localhost/production duplicate invite URLs.

After creating/starting the host, the UI provides a localized:

Add virtual player

button.

Virtual players are opened in separate browser windows.

The virtual-player URL automatically contains:

peer\_id

unique virtual player name

available color

This allows one developer/tester to simulate a multiplayer session on one computer.

Typical manual test flow:

Start page

→ Create Game

→ enter host name/color/player count

→ start host

→ Add virtual player

→ Add virtual player...

→ start gameplay

→ choose trader for each player

→ Wholesale: buy products

→ Traders: place traders

→ Event Cards

→ Privoz

→ end turn / continue round

Some navigation is still manual because the game is a prototype.

**# Rules page**

Rules page:

/rules

The page now contains a practical multiplayer-testing guide.

The primary current rules/testing content supports:

Russian

Ukrainian

English

Spanish

Navigation inside the guide uses application-relative React routes rather than hardcoded production URLs.

Older versions of the rules are hidden by default and can be revealed with the "show old rule versions" toggle.

The feedback instructions are also included in the testing guide.

**# Important security/privacy decisions**

Do not put SMTP passwords, admin passwords, tokens, PeerJS internals or other secrets into React REACT*\*APP\**\\\* variables.

REACT*\*APP\**\\\* values become public inside the frontend bundle.

Do not collect:

\- cookies;

\- arbitrary localStorage;

\- arbitrary sessionStorage;

\- passwords;

\- auth tokens;

\- .env contents;

\- PeerJS internal objects.

Only explicitly useful Privoz diagnostic data should be included.

**# Next major stage - Bot Player**

The next development stage is a player bot that can play instead of a real human.

This should be implemented on a new branch:

bot-player

Critical architectural rule:

THE BOT SHOULD BEHAVE LIKE A PLAYER.

It should not receive a special shortcut that directly mutates authoritative gameState.

Preferred conceptual flow:

Bot decision

→ same player ACTION used by UI

→ host

→ validation / game rules

→ reducer / authoritative mutation

→ broadcast

The bot should therefore exercise the same networking and game-rule paths as a human wherever possible.

This is important because the bot will also become a useful automated gameplay tester.

The existing "virtual player" flow should be studied before designing bot lifecycle.

Do not immediately build a large AI system.

Start with a very small deterministic vertical slice.

Recommended first bot slice:

bot identity / lifecycle

→ connect as normal player

→ inspect authoritative/current state

→ decide when it may act

→ perform one already-stable action

SELECT\_TRADER is a strong candidate for the first automated action because it already uses the host-authoritative action flow.

After that:

test

→ build

→ commit

Then expand the bot action-by-action.

Do not simultaneously refactor END\_TURN, BUY\_PRODUCT and all remaining gameplay actions while creating the initial bot infrastructure.

**# Bot design questions for next session**

Before implementation, inspect the current code and decide:

\- where the bot controller should live;

\- whether it should run in the virtual player's browser window or as another client/controller;

\- how it identifies that it is a bot;

\- how it observes gameState changes;

\- how it determines whether it is allowed to act;

\- how it avoids sending duplicate actions;

\- how it uses normal gameAction/network messages;

\- how deterministic choices can be made for testing;

\- how bot actions can later be included in debug/feedback logs.

The first implementation should be deterministic and simple.

Examples:

choose the first legal trader;

choose a valid product based on available coins;

choose the first legal sector;

Randomness or strategy can be introduced later.

**# Future game-core work**

END\_TURN host-authoritative migration is completed in Bot Player Stage 7.

Still pending is the gradual conversion of remaining legacy gameplay/event/round mutations and actions.

These tasks remain important and should continue as small, separately tested vertical slices.

**# Starting a new development session**

At the beginning of the next ChatGPT session:

1\. provide the current project ZIP or relevant files;

2\. tell ChatGPT to read this file first:

docs/GAME\_STATE.md

3\. inspect the actual current source before making changes;

4\. work from branch bot-player;

5\. preserve the working prototype;

6\. implement only one small bot vertical slice at a time.

Every accepted player decision should eventually produce a compact,

privacy-safe learning sample.

Learning data must represent only information available to the acting

player, legal actions available at that moment, the selected action,

and the eventual game outcome.

Human and bot decisions use the same learning format.
# Bot Learning / Policy Architecture

The bot architecture should be designed for a production environment where the developer's local computer and local Qwen model are assumed to be OFFLINE during normal gameplay.

The production website must remain fully autonomous.

Qwen is NOT required at runtime.

Target long-term loop:

gameplay on website

→ compact learning logs

→ export selected logs

→ local analysis / simulations

→ Qwen as offline analyst / teacher

→ improved bot policy

→ tests / simulation

→ Git commit

→ deploy new policy

→ collect new gameplay

→ repeat

The website bot should therefore use a small deployable decision policy rather than calling an LLM during a live game.

Conceptual runtime flow:

authoritative/current gameState

→ buildPlayerObservation()

→ DecisionProvider

→ PolicyEngine

→ BotDecision

→ same ACTION used by a human UI

→ HOST

→ validation / reducer

→ authoritative gameState

→ broadcast

The bot must never directly mutate authoritative gameState.

## Player observation boundary

Do not pass raw authoritative gameState directly to bot intelligence, learning analysis or a future AI provider.

Introduce a shared concept similar to:

buildPlayerObservation(gameState, playerId)

This should represent only information legally available to the acting player at that moment.

The same observation format should eventually be reusable by:

- Bot Player;
- learning logs;
- replay / analysis tools;
- simulation tools;
- future local Qwen analysis;
- future compact trained models.

This is an anti-cheating boundary.

Hidden cards, future events, private opponent information or any other information unavailable to a normal player must not be exposed through the observation.

## DecisionProvider abstraction

Bot decision logic should be replaceable.

Conceptual interface:

DecisionProvider

→ decide(observation, context)

The interface should be async-capable from the beginning even if the first implementation is deterministic and synchronous internally.

Initial provider:

RuleBasedDecisionProvider / PolicyDecisionProvider

Future providers may include:

- improved heuristic policies;
- simulation-backed policies;
- locally tested policies generated with Qwen assistance;
- a compact trained model;
- other AI providers.

The controller must not depend on a specific AI implementation.

Qwen should not generate or mutate gameState.

Qwen should also not be trusted as the source of game rules.

Game rules, legal actions and state transitions belong to normal deterministic game code.

## Initial bot intelligence

The first bot does NOT require Qwen.

Initial intelligence should come from deterministic game code:

legal action generation

→ simple evaluation

→ deterministic policy

→ normal player ACTION

The first SELECT_TRADER slice may simply choose the first legal trader.

Later the evaluator may score candidates using explicit features such as cost, expected profit, flexibility and risk.

The exact scoring weights can evolve over time.

## Future simulation layer

When more of the game becomes host-authoritative and deterministic enough for simulation, add a simulation layer separately from the live game.

Conceptual flow:

observation / state

→ legal candidate actions

→ simulate candidate A

→ simulate candidate B

→ simulate candidate C

→ candidate metrics

→ policy chooses action

Possible future methods:

- deterministic lookahead;
- heuristic evaluation;
- Monte Carlo rollouts;
- bot-vs-bot simulation;
- policy tournaments.

Qwen may analyze simulation results and propose strategy improvements, but proposed improvements must be validated by deterministic tests and/or simulation before deployment.

Do not accept an LLM recommendation as proof that a move or strategy is better.

## Learning data - humans and bots

Learning data must include decisions made by BOTH:

- real human players;
- bot players.

Human decisions are especially valuable because humans may discover strategies that the initial bot policy does not explore.

Bot and human decisions should use the same compact learning format wherever possible.

Every accepted player decision should eventually be capable of producing a privacy-safe learning sample containing only the information useful for game analysis.

Conceptually, a decision sample should contain:

- game ID;
- sequence number;
- game version;
- phase / round where useful;
- anonymous actor index;
- actor type: human or bot;
- bot policy version when applicable;
- player observation at decision time;
- legal actions available at decision time;
- selected action;
- whether the host accepted or rejected the action when relevant;
- eventual game outcome / ranking after the game finishes.

Do NOT collect learning data merely because it is technically available.

Prefer the smallest useful representation.

## Learning logs are separate from feedback/debug reports

Feedback/debug reports and learning logs have different purposes and must remain separate.

Feedback/debug reports:

- investigate bugs;
- may contain technical runtime diagnostics;
- are manually triggered;
- use the existing feedback infrastructure.

Learning logs:

- analyze gameplay decisions;
- should be compact;
- should avoid unnecessary runtime/browser information;
- should be created as part of gameplay;
- should be suitable for aggregation and training analysis.

Do not copy full feedback snapshots into learning logs.

Do not blindly serialize full gameState after every action.

## Privacy / data minimization

Learning logs should avoid unnecessary identifying information.

Do not store in learning logs unless there is a specific future requirement:

- real player names;
- raw PeerJS IDs;
- IP addresses;
- cookies;
- arbitrary localStorage/sessionStorage;
- browser fingerprinting data;
- passwords;
- tokens;
- environment variables;
- PeerJS internal objects.

Within a learning dataset, players should preferably be represented by anonymous per-game indexes such as:

player_0

player_1

player_2

The goal is gameplay learning, not user tracking.

## Compact storage format

Server storage must be designed for inexpensive shared hosting.

Prefer event / decision-oriented records over repeated full state snapshots.

A compact per-game record or append-friendly JSONL/NDJSON format is preferred.

A typical game should contain:

game metadata

→ compact accepted decision records

→ final outcome

Do not log cosmetic navigation, React renders or redundant network chatter.

If append-based storage is implemented, batching events is acceptable.

A final best-effort flush may later use browser mechanisms such as sendBeacon(), but this should not be mixed into the first bot slice unless required.

## Authoritative logging

Learning records should ultimately represent actions accepted by the HOST.

Preferred conceptual flow:

player/bot sends ACTION

→ HOST validates

→ reducer applies authoritative change

→ accepted decision is recorded

This avoids treating an attempted or invalid client action as a successful gameplay decision.

Where possible, human and bot actions should enter learning logging after the same host-authoritative validation path.

Legacy actions should be migrated carefully and individually before assuming this guarantee.

## Game result attachment

Decision quality cannot be analyzed properly without knowing the eventual result.

When a game finishes, the learning record should be finalized with useful outcome data such as:

- winner / ranking;
- final scores or relevant final resources;
- total rounds / turns;
- policy versions used by bots.

The exact result schema should follow the actual game rules and should remain compact.

## Policy versioning

Every deployed bot policy must have an explicit version.

Examples:

policy-v001

policy-v002

policy-v003

policy-v004

The version used by a bot must be included in learning records.

Policies should be versioned in Git.

Conceptually:

src/bot/policies/

policy-v001.json

policy-v002.json

...

This allows later comparison of policy performance and prevents mixing decisions from different bot generations without knowing which logic produced them.

## Learning log inventory / manifest

The server should maintain enough metadata to know which game logs exist and how they have been used.

Each stored game should eventually have tracking information conceptually equivalent to:

- game ID;
- date;
- storage size;
- number of human players;
- number of bot players;
- policy versions;
- status: unused / used / eligible_for_deletion;
- useCount;
- first training batch;
- last training batch.

This metadata may be stored in a manifest/index or derived safely from per-game metadata, depending on the simplest reliable implementation for the hosting environment.

The important requirement is that we must be able to answer:

- how many unused games exist;
- how many games have already been used;
- how many times a game has been reused;
- how much storage learning logs consume;
- which logs may be deleted safely.

## Training batches

Training / analysis exports should be explicitly versioned.

Example:

training-001

training-002

training-003

A future export may contain:

- manifest.json;
- games.jsonl;
- summary.json.

A training batch should record which game logs were included.

New training cycles should normally prioritize unused games but may deliberately include a smaller replay sample of older used games.

Conceptual example:

70% unused/new games

30% previously used replay sample

The percentages are NOT fixed rules and should remain configurable.

This prevents the learning process from focusing only on the most recent games.

## Log retention / cleanup

Do not keep detailed learning logs forever by default.

Old logs may become eligible for deletion after they have been used in multiple training/analysis cycles.

Possible future retention controls:

- minimum training use count before deletion;
- minimum age;
- maximum number of retained used games;
- maximum number of unused games;
- maximum storage size in MB;
- number of training generations to retain.

These values should be configuration, not hardcoded architecture assumptions.

Do NOT delete a game immediately after its first use.

After a detailed log is deleted, a very small aggregate/statistical record may be retained so long-term statistics such as total games, bot win rate or policy performance are not lost.

Deletion should initially be an explicit/admin-controlled operation until the process has been proven safe.

## Current learning inventory/admin status

The Learning Data Admin inventory, training-batch export and preview-first controlled cleanup slices are implemented.

Backend page:

api/learning-admin.php

It reuses the existing feedback-admin-config.php password hash, but uses a separate admin session. No second production secret is required.

Current Learning Data Admin capabilities:

- total stored games;
- unused / pending, used and eligible-for-deletion counts;
- total learning-log storage size;
- total / human / bot decision counts;
- games with attached outcomes;
- policy-version usage by games and decisions;
- per-game player counts, decision counts, useCount and status;
- raw per-game JSON inspection;
- warning when malformed learning JSON files are found;
- prepare a versioned training snapshot from configurable pending and replay counts;
- download a TAR/TAR.GZ package containing manifest.json, games.jsonl and summary.json;
- explicitly confirm a downloaded batch before useCount/status metadata is changed;
- retain a small batch manifest after confirmation while deleting the temporary duplicate archive;
- preview cleanup candidates using configurable minimum useCount, minimum age and maximum files;
- require confirmed training-batch history before a game can be considered cleanup-eligible;
- explicitly execute a previously reviewed cleanup preview only after typing DELETE;
- revalidate each game under a file lock immediately before deletion and skip games changed after preview;
- retain a compact cleanup manifest/history after detailed game logs are deleted.

State-changing admin actions use a CSRF token.

Training batch preparation does NOT immediately mark source logs as used. The intended workflow is:

prepare batch

→ download package

→ confirm used

→ increment useCount / set firstTrainingBatch and lastTrainingBatch

→ remove temporary archive

→ retain source game logs and small batch manifest

If a game receives additional accepted decisions after a training snapshot was prepared, confirmation still records that snapshot use, but the game remains unused / pending so the newly appended data can be exported again later. A previously used game that receives a new accepted decision is also automatically marked pending again without losing its existing useCount/history.

## Current learning retention / cleanup status

Cleanup is intentionally conservative and admin-controlled.

Default eligibility criteria are currently:

- game status must be used, never unused / pending;
- stored useCount must be at least 3;
- the game must appear in at least 3 confirmed training batch manifests;
- the last gameplay data (updatedAt) must be at least 30 days old;
- at most 100 logs are selected by the default preview.

These are UI/configuration defaults rather than permanent game-design assumptions. The Learning Admin preview can use different values when needed.

Cleanup flow:

used learning logs

→ Preview cleanup

→ create a versioned CLEANUP-* manifest containing candidate IDs and compact summaries

→ no deletion yet

→ administrator reviews candidate list / size

→ administrator types DELETE and confirms

→ each source game is reopened and locked

→ source updatedAt / decision count / useCount / status / confirmed training history are revalidated

→ changed or newly pending games are skipped

→ unchanged eligible logs are removed

→ compact deleted-game summaries remain in the cleanup manifest as history

There is NO scheduled or automatic cleanup.

Cleanup history intentionally keeps only compact aggregate metadata such as game ID, useCount, training-use count, player/decision counts, policy versions, outcome presence and deleted byte size. Full gameplay decisions are removed with the game log.

The cleanup implementation uses confirmed training manifests as an independent safety check rather than trusting useCount alone. This prevents a manually corrupted status/useCount field from being sufficient to delete a game.

For local testing, cleanup preview may temporarily use min useCount = 1 and age = 0 days. Production defaults should remain conservative unless there is a deliberate reason to change them.

Game-log deletion is implemented only through the explicit preview-first Learning Admin flow. There is no automatic/background cleanup.

## Admin / export workflow

A future learning-data admin tool should allow the developer to inspect at least:

- unused game count;
- used game count;
- total stored game count;
- approximate storage size;
- policy-version distribution;
- logs eligible for deletion.

Useful future actions:

- export a training batch;
- download unused logs;
- mark/export logs as used;
- generate a compact analysis package;
- clean up old eligible logs.

Do not build the full admin system as part of the first SELECT_TRADER bot slice.

## Copyable / AI-friendly analysis packages

For small or medium datasets, provide a way to generate compact summaries suitable for copying into a local Qwen session.

For larger datasets, export machine-readable files instead of producing enormous copy/paste text.

The local analysis pipeline may later split large datasets into chunks, analyze chunks independently and then synthesize results.

The server should not be responsible for running Qwen.

## Role of local Qwen

The local Qwen model should be treated initially as an offline analyst / teacher, not as the live game engine.

Expected workflow:

download selected learning batch

→ deterministic preprocessing / statistics

→ simulation where available

→ Qwen analyzes patterns and proposes strategy changes

→ convert accepted ideas into a new explicit policy

→ automated/manual tests

→ bot-vs-bot comparison when available

→ deploy only after validation

Initially, "training the bot" means improving the deployed bot policy with evidence from game logs and simulations.

It does NOT necessarily mean fine-tuning Qwen's model weights.

Actual model fine-tuning or distillation can be considered later when enough clean decision data exists.

## Future compact trained model

If enough high-quality decision samples accumulate, a future phase may train a much smaller model specifically for Privoz.

Conceptual future flow:

game logs

→ curated dataset

→ local training / teacher analysis

→ compact student model

→ deploy small model to browser/site

This model could potentially replace or complement heuristic policies while still using:

observation

→ decision

→ normal ACTION

→ HOST

The host-authoritative security model must remain unchanged.

## Bot Player implementation roadmap

Keep the first implementation small despite the long-term learning design.

Recommended safe sequence:

1. Bot identity / lifecycle.

2. Bot connects through the existing normal PeerJS player flow.

3. Introduce buildPlayerObservation() or equivalent minimal observation boundary required for the first action.

4. Introduce replaceable DecisionProvider / PolicyEngine structure.

5. Implement one deterministic SELECT_TRADER decision.

6. Convert that decision into the same SELECT_TRADER action used by human UI.

7. Send it through the normal client → HOST → reducer → broadcast flow.

8. Prevent duplicate bot actions while the turn remains unchanged.

9. Add the smallest useful learning record for accepted SELECT_TRADER decisions for BOTH humans and bots.

10. Attach policy version to bot learning records.

11. Build / git diff --check / multiplayer test / commit.

12. Only after the slice is stable, expand learning and bot support action-by-action.

Do NOT use this roadmap as justification to refactor END_TURN, BUY_PRODUCT or unrelated legacy flows during the initial bot work.

## Current Bot Player stage - wholesale behavior (policy-v002)

The next bot slice expands the already stable SELECT_TRADER flow into wholesale purchasing without changing END_TURN.

BUY_PRODUCT is now intended to follow the same host-authoritative rule as SELECT_TRADER:

human or bot decision

→ BUY_PRODUCT action

→ HOST

→ reducer validation

→ authoritative gameState

→ broadcast

→ learning decision

Wholesale previously mutated local gameState directly. This slice migrates only BUY_PRODUCT to the reducer/action path. END_TURN remains legacy and manual for bots.

Bot runtime now has a temporary lifecycle stage separate from gameState.phase:

awaiting_turn

→ trader

→ wholesale

→ done

This lifecycle is necessary because the prototype currently keeps trader selection and wholesale inside the broader trader_selection game phase. It is a UI/controller compatibility layer, not a replacement for authoritative phases.

After authoritative SELECT_TRADER confirmation, a bot navigates to Wholesale and may send multiple BUY_PRODUCT actions. Duplicate protection is state/decision based rather than one-action-per-turn, so the same purchase cannot be resent before authoritative confirmation while a confirmed purchase can lead to another decision.

END_TURN is still manual. When the authoritative turn moves away, the bot lifecycle resets for its next turn.

The active deployable policy is now:

policy-v002

Bot behavior profiles are explicit metadata and should be stored with the bot player and learning samples:

- balanced - keeps a small reserve and prefers legal/value purchases;
- all_in - tries to spend as much available money as possible;
- saver - keeps a larger reserve and buys only legal goods;
- specialist - prefers repeatedly buying within a sector already represented in its inventory;
- diversifier - prefers sectors not yet represented in its inventory;
- smuggler - buys only illegal goods and keeps a minimal reserve.

These profiles are intentionally deterministic for reproducible testing. They are not claims about optimal play. Their purpose is to generate different strategy families that can later be compared using real game outcomes, simulations and offline Qwen analysis.

The host can choose a bot behavior profile before adding each bot. The selected profile travels through the normal bot join flow and is stored as botBehaviorProfile. Learning records for bot decisions include both policyVersion and behaviorProfile.

buildPlayerObservation() schema version 2 adds only the public wholesale product information needed for purchasing plus the represented player's own product inventory. It still must not expose hidden/private information.

BUY_PRODUCT learning samples should contain:

- anonymous actorIndex / actorType;
- policyVersion and behaviorProfile for bots;
- player coins and own compact product holdings;
- public available products with price/profit/sector/legality/free quantity;
- all game-legal affordable BUY_PRODUCT actions;
- the selected product;
- accepted result.

Policy restrictions such as reserve money or legal-only behavior are NOT game legal-action restrictions. The learning log's legalActions must describe what the rules allowed, while behaviorProfile explains why a bot may intentionally ignore some legal choices.

This slice must not refactor trader placement, END_TURN, event handling or unrelated rules.

## Validation workflow

After each substantial implementation slice:

npm run build

git diff --check

manual and/or automated multiplayer test

separate commit

Bot changes should remain reviewable and reversible.

## Long-term closed loop

The intended long-term system is:

human and bot games

→ compact privacy-safe learning logs

→ controlled server storage

→ training batch selection

→ local download

→ deterministic statistics / replay / simulation

→ Qwen offline analysis

→ improved policy

→ validation / bot arena

→ deploy new policy version

→ collect new games

→ repeat

The production game must continue to work even when the local computer, Qwen and all training tools are unavailable.

## Current Bot Player stage - trader placement (policy-v003)

Stage 6 extends the bot and human gameplay flow from wholesale purchasing into trader placement.

PLACE_TRADER is now intended to use the same host-authoritative architecture as SELECT_TRADER and BUY_PRODUCT:

human or bot decision

→ PLACE_TRADER action

→ HOST identity/random preparation

→ reducer validation

→ authoritative gameState

→ broadcast

→ learning decision

The action payload contains only player intent:

- traderId;
- target sector;
- productIds to transfer to the trader.

Client-supplied playerId is never trusted by the host. Event-card selection is also host-only: when a placement transfers at least one product, the host selects the random event-card ID from the currently available deck and adds it to the authoritative action before the pure reducer applies the result. A client cannot choose its own event card.

Shared PLACE_TRADER rules now enforce:

- only the current player may place a trader;
- the trader must belong to that player and must still be unplaced;
- the target sector must exist;
- sector capacity remains equal to the number of players, matching the existing prototype UI rule;
- placement cost keeps the existing prototype formula;
- a trader may receive at most 3 product cards, matching rulesTranslations.js;
- the player must actually own every transferred product quantity;
- legal products must match the selected sector;
- illegal products may be transferred in any sector, preserving the existing prototype rule;
- "Household goods" and product sector "household" are normalized to the same sector.

The human PrivozSector UI must use this same action/reducer path. Client-side validation is only for immediate UX; HOST validation remains authoritative.

The bot lifecycle now becomes:

awaiting_turn

→ trader

→ wholesale

→ placement

→ done

After its wholesale policy returns no further purchase, the bot navigates to /game/:peerId, chooses one unplaced trader, a legal sector and up to 3 owned products, sends one PLACE_TRADER action and waits for authoritative confirmation. END_TURN remains manual in this slice.

policy-v003 keeps the existing wholesale profiles and adds deterministic placement behavior:

- balanced - places up to 2 goods, preferring legal/value combinations;
- all_in - tries to fill the trader with up to 3 useful goods;
- saver - places only 1 legal good when available;
- specialist - concentrates legal goods in one matching sector;
- diversifier - prefers a sector not already used by that player's placed traders;
- smuggler - places only illegal goods and prefers the trader's favorite sector when possible.

These are baseline strategy families, not optimal-play claims. Their purpose is to generate distinct, reproducible behavior for later comparison with human play, simulation and offline Qwen analysis.

buildPlayerObservation() now includes only the additional placement information the represented player may legally know:

- own unplaced/placed trader IDs, locations and favorite sector;
- own compact products with sector/legality/value;
- placement cost;
- public sectors with occupancy and capacity.

PLACE_TRADER learning records use schemaVersion 3 and contain:

- anonymous actorIndex / actorType;
- policyVersion / behaviorProfile for bots;
- compact placement observation;
- compact legal placement envelopes per trader/sector with eligible owned product IDs and quantities;
- selected trader, sector and productIds;
- accepted result.

The random event-card ID is not part of the player's selected action in learning data because it is not a player decision.

Stage 6 intentionally does NOT automate END_TURN or refactor unrelated event-resolution/end-round flows.

## Current Bot Player stage - automatic END_TURN (policy-v004)

Stage 7 completes the current per-player bot turn by migrating END_TURN to the same host-authoritative gameAction architecture used by SELECT_TRADER, BUY_PRODUCT and PLACE_TRADER.

Current bot turn flow:

awaiting_turn

→ trader

→ wholesale

→ placement

→ end_turn

→ HOST advances currentTurnUserId

→ bot receives authoritative state showing that its turn ended

→ awaiting_turn

END_TURN now follows:

human or bot intent

→ END_TURN action

→ HOST assigns authoritative playerId

→ reducer validation

→ authoritative gameState

→ broadcast

The reducer accepts END_TURN only from the current player. Client-provided playerId is never trusted. The host's own End Turn button also uses the same applyHostGameAction() path instead of a separate local mutation path.

The old client message containing:

endTurn + client gameState

is removed from the active gameplay flow. Clients no longer send their copy of gameState to advance the turn.

Legacy page-level END_TURN listeners are removed from TraderList, Wholesale and GamePage. The shared Menu listener remains the single host gameplay listener for remote gameAction messages.

END_TURN preserves existing prototype behavior only:

- currentTurnUserId advances to the next player;
- waitingForHost is cleared;
- round is unchanged;
- phase is unchanged.

Round progression remains owned by the existing round/end-event flow and is NOT silently moved into END_TURN in this slice.

Bot policy-v004 keeps the policy-v003 trader/wholesale/placement strategy families and adds deterministic end-turn behavior. A bot sends END_TURN only after its current turn work is complete, including the case where no legal trader or placement action exists.

After a successful PLACE_TRADER authoritative broadcast the bot observes the placed trader, marks placement complete, changes its lifecycle stage to end_turn and sends the normal END_TURN action. When the next authoritative broadcast shows another currentTurnUserId, the bot resets its lifecycle to awaiting_turn.

END_TURN is not currently stored as a learning decision because the present policy has no strategic choice at that point. This avoids adding repetitive low-value records to learning storage. If future rules introduce meaningful choices about when/how to finish a turn, the learning schema can be extended then.

### sectorsWithTraders consistency fix

sectorsWithTraders is treated as a derived compatibility field and must match real trader.location values.

A shared player-derived-state helper now recalculates the field from the player's traders.

This is applied when:

- PLACE_TRADER updates trader locations;
- an event effect returns/confiscates a trader to the player's hand;
- end-round processing returns sold-out traders to hand.

Therefore a player must not retain a stale sector such as "Dairy" after the last trader in that sector has location = null.

### Stage 7 validation

Required tests before commit:

- non-current players cannot END_TURN;
- HOST overwrites spoofed END_TURN playerId;
- host UI and remote clients use the authoritative reducer/broadcast path;
- policy-v004 emits a normal END_TURN action;
- bot placement completion is followed automatically by END_TURN;
- the next bot starts only after authoritative currentTurnUserId changes;
- sectorsWithTraders is cleared/recalculated when traders return to hand;
- existing SELECT_TRADER / BUY_PRODUCT / PLACE_TRADER tests remain green;
- npm run build;
- git diff --check;
- manual Host + multiple bots test.

Stage 7 does NOT migrate the full round-end/event-choice system. That remains separate follow-up work.

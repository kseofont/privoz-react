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

## Current Bot Player stage - personal event choices / automatic result ACK (policy-v005)

Stage 8A removes the current round-transition blocker for bots without defining final game outcome rules yet.

Scope of Stage 8A:

- personal event choices;
- bot keep/use decisions for positive cards;
- bot target selection for negative cards;
- host-authoritative validation of event submissions;
- automatic bot ACK of event-result messages/modals;
- privacy-safe learning samples for strategic event choices.

Game outcome/final ranking is intentionally deferred to Stage 8B because the authoritative game-length/end trigger still needs to be defined explicitly.

Personal event submission now follows the normal gameplay path:

human or bot decision

→ SUBMIT_EVENT_CHOICES action

→ HOST assigns authoritative playerId

→ host validates/normalizes choices and targets

→ reducer marks that player's event choice complete

→ authoritative gameState

→ broadcast

When every player has submitted, the existing host round-finalization flow applies the selected card effects and advances the round.

The old direct PeerJS messages eventCardChoiceDone and ackEventResults are removed from the active Menu flow. Human UI and bots use gameAction for these interactions.

### Event-choice validation

The host accepts choices only for cards actually owned by the acting player.

Positive cards support the existing prototype choices:

- keep - pay 5 coins and retain the card when affordable;
- use - apply the card now and consume it.

Targets are sanitized according to card goal/fortune:

- negative sector targets may reference only sectors containing opponents' placed traders;
- negative trader targets may reference only opponents' placed traders;
- negative player targets may reference only opponents;
- positive trader targets may reference only the acting player's placed traders.

Invalid/spoofed targets are removed by the host before the reducer stores the choice.

### Bot event behavior

Bot personal-event decisions are simultaneous round decisions and therefore do NOT depend on currentTurnUserId.

BotPlayerController checks PERSONAL_EVENTS before normal per-turn lifecycle handling. A bot whose eventCardPhase entry is still false submits exactly one host-authoritative event decision for that round.

policy-v005 keeps the previous trader/wholesale/placement/end-turn behavior and adds event-choice strategy families.

Initial deterministic event strategies:

- balanced - uses a positive card when its effect is useful now; negative sector cards prioritize illegal/off-sector exposure;
- all_in - uses positive cards immediately and targets the largest immediate damage opportunity;
- saver - avoids paying the keep cost when possible and uses positive cards immediately;
- specialist - favors event pressure in sectors where it competes/operates;
- diversifier - may keep a positive card when affordable and attacks crowded opponent sectors;
- smuggler - uses positive cards immediately when they reinforce its illegal goods and strongly targets competing illegal/off-sector goods.

For the current Federal Police card, sector scoring explicitly considers:

- number of illegal goods;
- goods whose native sector does not match the trader's current sector;
- unprotected traders;
- goods count/value.

Therefore a visible opponent selling an illegal product such as Vodka in the Dairy sector is intentionally a high-priority Federal Police target for the relevant baseline strategies.

These are deterministic baseline behaviors for comparison/testing, not optimal-play claims.

### Automatic bot result ACK

Event-result acknowledgement is housekeeping rather than a strategic decision.

Bots do not show the human event-choice/result modals. When eventResultLog contains new rows for a bot, BotPlayerController sends:

ACK_EVENT_RESULTS

through the normal gameAction → HOST → reducer → broadcast path.

The reducer clears only that acting player's result log. The ACK is not stored as a learning decision.

Human players continue to see the result modal and their OK/close flow sends the same host-authoritative ACK action.

### Event learning data

Accepted SUBMIT_EVENT_CHOICES actions are stored as strategic learning decisions using schemaVersion 4.

The event learning observation contains only gameplay-relevant information available to the represented player:

- own coins;
- own event cards/effects;
- own placed traders and compact goods;
- anonymous opponent actor indexes;
- opponents' publicly visible placed traders/goods;
- legality/sector/value information needed to evaluate targets.

It does NOT store player names or PeerJS IDs.

The selected action records:

- positive keep/use choices;
- selected sector/trader targets;
- player targets as anonymous actor indexes if such cards are introduced.

The legal-action envelope records the available choices/targets for each owned event card.

### Stage 8A validation

Required tests before commit:

- bot submits event choices even when it is not currentTurnUserId;
- policy-v005 chooses a valid target for Federal Police;
- illegal Vodka placed in Dairy is preferred over an ordinary legal target by the relevant policy;
- positive Porters can be used automatically when a useful own trader exists;
- spoofed playerId is overwritten by HOST;
- invalid/self targets are removed by HOST;
- reducer marks only the acting player's eventCardPhase complete;
- human event modal uses the same SUBMIT_EVENT_CHOICES action;
- bot automatically ACKs eventResultLog without a click;
- human result modal uses the same ACK_EVENT_RESULTS action;
- ACK clears only the acting player's result log;
- event learning sample is compact and contains no names/PeerJS IDs;
- existing SELECT_TRADER / BUY_PRODUCT / PLACE_TRADER / END_TURN tests remain green;
- npm run build;
- git diff --check;
- manual Host + multiple bots test through round 1 → personal events → round 2.

Stage 8B will separately define authoritative game completion and final outcome/ranking logging after the game-length/end condition is clarified.

## Current game completion stage - 14-round outcome finalization (Stage 8B)

Stage 8B defines the first explicit authoritative game-completion rule.

Temporary/current game-length rule:

- the game lasts 14 full rounds;
- round 14 is the final round;
- final Event Card effects are applied normally;
- end-of-round sales are applied normally;
- only AFTER those final sales is the winner calculated;
- the player with the highest final coin balance wins.

The implementation intentionally interprets "14 turns" as 14 complete gameState.round cycles because round is the existing authoritative full-round counter.

No secondary tie-break rule is invented. If two or more players share the highest final coin balance, they are recorded as co-winners until a future explicit rule says otherwise.

### Final round settlement

Round settlement is extracted into a pure game rule helper.

For rounds before 14:

ROUND_END

→ sell placed trader goods

→ return sold traders to hand

→ recalculate sectorsWithTraders

→ round + 1

→ TRADER_SELECTION

For round 14:

ROUND_END

→ apply the same final sales

→ return sold traders to hand

→ recalculate sectorsWithTraders

→ calculate ranking from final balances

→ GAME_END

The final state keeps round = 14 and clears currentTurnUserId so bots/players cannot start an accidental round 15.

### Final game outcome

gameState.gameOutcome is privacy-safe game result metadata containing:

- rule: highest_coins;
- completedRound;
- maxRounds;
- maxCoins;
- winnerActorIndexes;
- anonymous ranking entries by actorIndex;
- actorType human/bot;
- final coins;
- place;
- isWinner;
- bot policyVersion / behaviorProfile where applicable.

It must not contain player names or PeerJS IDs.

Tied balances use shared places (for example 1, 1, 3) and every player sharing maxCoins is a winner.

### Learning outcome finalization

The HOST records one separate privacy-safe outcome record when authoritative state reaches GAME_END.

The learning endpoint accepts:

recordType: outcome

with a deterministic event ID such as:

LE-OUTCOME-14

The backend stores the normalized outcome in the existing per-game learning JSON under:

outcome

It does NOT append outcome to the strategic decisions array.

The outcome is idempotent. Re-sending the same outcome event does not duplicate data.

If a game had already been included in a training batch before its final outcome was available, saving the outcome marks that game unused/pending again while preserving its existing useCount and training history. This ensures the final result can be included in a later training batch.

Training export already carries the game outcome field, so completed games become directly useful for comparing decisions/policies against final results.

### Game-end UI

When phase = GAME_END:

- END_TURN is no longer available;
- host round-end controls are no longer available;
- Menu displays final round, winner/co-winners and ranking by final coins;
- player names may be shown in the live UI, but they are not written into learning outcome records.

### Stage 8B validation

Required tests before commit:

- settling round 13 advances to round 14 and does not end the game;
- settling round 14 applies sales before ranking;
- round 14 stays round 14 rather than creating round 15;
- phase becomes GAME_END;
- currentTurnUserId becomes null;
- highest final coin balance wins;
- equal top balances produce co-winners without an invented tie-break;
- final ranking contains no player names/PeerJS IDs in the learning record;
- production/local learning backend stores outcome under game.outcome;
- duplicate outcome submission is idempotent;
- Learning Admin With outcome counter increases;
- training export includes outcome;
- npm run build;
- git diff --check;
- manual round-14 end test.

Stage 8B does not change bot strategy policy-v005. Game completion is a game-core rule, not a new bot decision policy.

# Debug Menu / Local Test History

During active multiplayer/bot testing, Menu should expose a human-readable diagnostic view instead of dumping raw arrays/objects wherever possible.

The debug UI is intentionally separate from server learning data.

Local debug history:

- lives in browser sessionStorage;
- is keyed by gameId;
- is not sent to /api/learning.php;
- may contain live player names/technical IDs because it is a local testing aid;
- should not be treated as training data.

The current player debug view should show:

- summary: coins, traders, products, Event Cards, bot policy/profile;
- every available trader field using localized field labels and descriptions;
- trader image, location/status and assigned goods;
- product fields in structured cards;
- private Event Cards owned by that current player;
- observed player-state history;
- detailed coin history;
- Event Card decisions/results involving that player.

Other-player debug views should show the public/previously-visible game information used for testing:

- name/color/current coins;
- bot profile/policy when applicable;
- traders and their public card fields/location/goods;
- currently visible player products according to the existing prototype state;
- observed state-change history;
- coin history behind a collapsed control;
- played Event Card/effect history behind a collapsed control.

Do not expose another player's currently held private Event Cards merely for the debug UI.

Coin history should be derived from authoritative state transitions for ALL observed players and explain useful causes where they can be inferred, including:

- trader acquisition;
- wholesale product purchase;
- round-end sales with trader/product/quantity/value details;
- Event Card effects/fines using the exact engine result messages when available;
- fallback income/expense entries for otherwise unknown changes.

Event history should capture:

- submitted played-card decision;
- use/keep choice where applicable;
- target player/sector/trader when visible;
- localized card title/description and configured effect;
- exact eventResultLog output after application.

The local debug history is capped to prevent uncontrolled sessionStorage growth.

## Debug / Learning Log Reliability Hardening

Stage 9.1 hardens the two diagnostic paths before expanding the full Event Card deck.

Local Menu debug history now has two sources:

- synchronous accepted-action persistence through the host accepted-action observer;
- authoritative state-diff fallback for automatic transitions such as round settlement and Event Card resolution.

This prevents a BUY_PRODUCT transition from disappearing when React navigation/unmounting or batched state updates happen before Menu's effect observes the intermediate state.

Coin history entry IDs are deterministic per authoritative transition so the synchronous path and state-diff fallback deduplicate cleanly. Repeated identical product lines sold by one trader are aggregated for display, and a sale that advances the round is attributed to the completed round (`round_end`) rather than the newly started round.

Server learning decisions remain action-based. Every accepted SELECT_TRADER / BUY_PRODUCT / PLACE_TRADER / SUBMIT_EVENT_CHOICES decision is built from beforeState + accepted action + afterState. Consecutive purchases of the same product have distinct event IDs because the BUY event ID includes the pre-action owned quantity and coin balance.

Learning POST delivery now has a small browser-local retry outbox for transient network / 5xx / 408 / 429 failures. Backend eventId deduplication makes retries idempotent. Permanent 4xx validation failures are not retried forever. Final outcome records use the same reliable delivery path.

# Stage 10 - Full Event Deck Test Mode

Current test configuration uses `DEFAULT_MAX_GAME_ROUNDS = 7` so complete games finish faster while the full Event Card deck is being validated. The final settlement rule is unchanged: round 7 sales/effects complete before `GAME_END` ranking is calculated from final coins.

The active deck is `src/data/eventcards.json` and contains all 13 configured Event Card types. `eventcards_old.json` remains an archive/reference file and is not imported by the runtime.

## Stage 10B - Card-aware bot event policy

`policy-v008` keeps the existing behavior profiles but makes personal-event targeting aware of the actual card effect instead of applying one generic sector score to every negative card.

Negative cards:

- confiscation cards prioritize the real first victim's unprotected goods value, number of goods, trader disruption and configured fine;
- fine-only cards prioritize sectors where the real first victim has more unprotected traders;
- `price_fine` cards prioritize sectors with more unprotected goods and scale the score by the configured price penalty;
- protected traders/goods are discounted because the authoritative event engine skips them;
- sector evaluation mirrors `findVictimBySector`: later opponents in the same sector are not incorrectly added to the score when the engine would actually hit an earlier opponent.

Positive cards:

- Underworld Protection prefers an exposed trader, especially one carrying illegal/mismatched goods;
- Regular Customer prefers the trader whose goods gain the largest useful single-trader price buff;
- Transport and Porters require a legal trader target for submission and prefer a trader already carrying goods, even though their current authoritative effects may apply more broadly;
- the smuggler profile saves protection when it has no illegal exposure, but still uses useful economic positive cards rather than hoarding them for an unrelated legality condition.

Required Stage 10B validation:

- all 13 active card types are present;
- all negative cards receive a legal sector target when a useful target exists;
- confiscation/fine/price-penalty cards can choose different sectors based on their actual effect;
- all four positive cards receive a use/keep choice;
- trader-target positive cards receive a legal own-trader target when used;
- Underworld Protection prefers exposed illegal inventory;
- target scoring matches the first victim the authoritative engine will actually affect;
- learning samples remain identity-free and report `policy-v008` for fresh v008 bots;
- existing wholesale/placement/end-turn/event tests remain green;
- `git diff --check` and production build pass.

<!-- CURRENT_STATE_2026-09-10 -->

# LATEST CURRENT STATE - 2026-09-10

This section is the authoritative current snapshot. Older stage sections elsewhere in this file are historical and must not override this snapshot.

## Production baseline

Production:

https://privoz.kotucheniy.com.ua/

Current production status:

- playable React + PeerJS multiplayer prototype is deployed;
- host-authoritative action flow is the architectural baseline;
- bot gameplay through policy-v008 is deployed;
- the full active Event Card data set (13 card definitions) is deployed;
- current test game length is 7 rounds;
- round 7 performs final settlement before GAME_END;
- winner is determined by highest final coin balance;
- tied players with the same maximum balance are co-winners; no tie-breaker is implemented yet;
- detailed debug Menu / local history is deployed;
- learning decisions for humans and bots are stored server-side;
- completed-game outcome/ranking storage is implemented and has been verified with a full 7-round game;
- feedback/debug reporting and admin viewer are deployed;
- learning admin, batch export, explicit use tracking and cleanup history are implemented.

Current bot architecture remains:

Bot decision
→ same ACTION path as human UI
→ HOST
→ validation / rules
→ reducer
→ authoritative gameState
→ broadcast
→ clients

Bots must never directly mutate authoritative gameState.

## Verified current gameplay

Verified in a complete local 7-round game:

- human + two bots can progress through all rounds;
- multi-round bot trader lifecycle continues after round 1;
- bots can place all owned traders before ending turn;
- trader placement itself is free;
- trader acquisition cost is separate from placement;
- wholesale purchases are logged as individual learning decisions;
- Event Card choices are automated for bots;
- full Event Card effect classes are covered by tests;
- GAME_END occurs after round 7 rather than starting round 8;
- final sales happen before winner calculation;
- Learning Admin records outcome=yes for completed games;
- policy-v008 decisions are visible in Learning Admin.

## Current development status by area

### COMPLETE / DEPLOYED

- PeerJS lifecycle stabilization.
- Host-authoritative SELECT_TRADER.
- Host-authoritative BUY_PRODUCT.
- Host-authoritative PLACE_TRADER.
- Host-authoritative END_TURN.
- Host-authoritative Event Card choice submission and result acknowledgement.
- Bot player lifecycle and behavior profiles.
- Multi-round bot placement/end-turn flow.
- policy-v008 card-aware bot targeting.
- Seven-round test game.
- Full active Event Card definitions.
- Game outcome / ranking logging.
- Detailed debug Menu.
- Coin/action/Event Card history for testing.
- Learning persistence, admin viewer, batch export, use tracking and controlled cleanup.
- Feedback reporting/admin infrastructure.

### IN PROGRESS / NEXT SMALL TASKS

1. JoinGamePage retry UX.
   - A PeerJS transport connection must not be treated as successful lobby acceptance.
   - nameTaken/colorTaken and other lobby validation failures must leave an obvious retry path.
   - corrected name/color should be resubmitted over the existing open DataConnection when possible.
   - no extra ghost PeerJS clients should be created for ordinary validation retries.

2. Current multilingual Rules v4.
   - keep old rule versions as history;
   - current rules must describe only implemented behavior;
   - support RU / UA / EN / ES.

### RULES V4 REQUIRED FOLLOW-UP ITEMS

Before Rules v4 is considered final, explicitly document in all four languages:

- each trader may have at most 3 goods assigned when being placed on the market;
- Event Card deck statistics must be derived from src/data/eventcards.json rather than hardcoded:
  - number of card definitions/types;
  - total currently active card copies (sum of quantity_active);
  - wording should make clear that these values may change as the deck is rebalanced;
- explain the current tie rule in plain language:
  - a "tie-breaker" is an additional rule used to choose one winner when scores are equal;
  - Privoz currently has no tie-breaker;
  - if several players share the highest final coin total, they are co-winners.

### PENDING GAMEPLAY EDGE CASE

Stage 10C - duplicate Event Card copies in one player's hand.

Current data can merge equal card types through quantity_active/card.id semantics. Before the Event Card system is considered fully finished:

- allow multiple copies of the same Event Card to be represented independently;
- allow use/keep choice per copy;
- consume only the selected copy;
- support human UI and bot policy;
- preserve correct debug and learning history;
- add regression tests.

### PLANNED LEARNING / BOT WORK

After Stage 10C and more completed games:

- collect multiple outcome=yes games;
- prepare the first meaningful training batch;
- analyze games locally with Qwen;
- compare behavior profiles by win rate, average place, final coins and decision patterns;
- use observed data rather than intuition alone for the next strategy revision;
- produce a later policy version based on measured results;
- build a local bot-vs-bot simulation runner so many complete games can be generated without manual clicking;
- consider adding aggregate strategy statistics to Learning Admin.

### DEFERRED / CONFIGURABLE LATER

- Returning game length from 7 to 14 rounds.
  Seven rounds are currently intentional for faster development/testing.
  Long-term, round count should preferably become a game/lobby setting rather than another hardcoded rewrite.

- Further balance changes to Event Card quantities/weights.
  The deck is expected to evolve after gameplay and learning-data analysis.

- Further bot strategy changes.
  policy-v008 is a tested baseline, not a final AI strategy.

## Today's implementation order

Current intended order for the remainder of this development cycle:

1. finish and test JoinGamePage retry/recovery UX;
2. finalize Rules v4 including the queued clarifications above;
3. run join tests for duplicate name, duplicate color, invalid form data, full lobby and successful retry;
4. build + git diff --check + commit;
5. deploy the small UX/rules update;
6. continue with Stage 10C duplicate Event Card copies;
7. then begin accumulating completed games for the first real learning analysis.

This roadmap is intentionally provisional.

If repository inspection, gameplay tests, user feedback, learning data or new rules information reveal a better implementation order, update this section and prefer the newly verified information over this plan.

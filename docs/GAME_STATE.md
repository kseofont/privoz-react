# Privoz - Current Project State

Updated: 2026-09-09

## Project

"Привоз" is a multiplayer board-game prototype built with React + PeerJS.

Production:

https://privoz.kotucheniy.com.ua/

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

# Current Git state

The current large development branch being closed is:

game-core-refactor

After this state document is committed, game-core-refactor should be merged into main.

The next development branch should be:

bot-player

# Networking / game-core architecture

PeerJS lifecycle has been stabilized.

Important architecture files:

src/game/actions.js

src/game/reducer.js

src/game/hostActionHandler.js

src/game/phases.js

Explicit game phases exist.

SELECT_TRADER has already been converted to the host-authoritative flow:

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

Some gameplay flows are still legacy.

In particular END_TURN has NOT yet been fully converted to host-authoritative architecture.

BUY_PRODUCT and other gameplay actions must be inspected individually before assuming they are host-authoritative.

Do not refactor END_TURN or unrelated game rules accidentally while implementing the bot.

# Feedback / Debug Reporting

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

1. open Feedback;

2. describe a bug or suggestion;

3. send a diagnostic report;

4. copy the technical report as a fallback.

The diagnostic snapshot is intentionally compact and whitelist-based.

It does NOT serialize PeerJS Peer/DataConnection objects or blindly dump browser storage.

Useful diagnostic information includes:

- feedback ID;

- timestamp;

- player/user ID;

- host/client role;

- round;

- phase;

- currentTurnUserId;

- players;

- balances;

- products;

- traders;

- trader locations;

- relevant event-card state;

- eventResultLog / eventResultNonce;

- lastAction / lastEvent when available;

- limited coins log;

- network summary;

- browser/runtime information;

- app version;

- Git commit;

- state keys;

- state fingerprint.

The snapshot is captured when the feedback modal is opened so later game-state changes do not silently replace the state associated with the reported bug.

# Feedback backend

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

https://privoz.kotucheniy.com.ua/api/feedback-admin.php

It is protected by the configured password.

A "View reports" / localized equivalent button is available in Menu below the Feedback button.

The admin viewer and JSON reports can be inspected directly in the browser.

Email notification has NOT been implemented yet.

# Feedback local development

Local feedback API runs separately from React:

PRIVOZ_FEEDBACK_DIR=/tmp/privoz-feedback \

php -S localhost:8082 -t .

React local environment uses:

.env.local

with:

REACT_APP_FEEDBACK_API_URL=http://localhost:8082/api/feedback.php

.env.local is ignored by Git.

IMPORTANT:

Never build/deploy production while .env.local is active, otherwise CRA can embed localhost:8082 in the production JavaScript bundle.

Safe production procedure:

remove .env.local

unset REACT_APP_FEEDBACK_API_URL

npm run build

Then verify:

grep -R "localhost:8082" build/static/js \

&& echo "ERROR: localhost found" \

|| echo "OK: production build clean"

Production must use:

/api/feedback.php

# Build/version information

package.json now runs the build through:

scripts/build.js

The build wrapper injects application/build metadata including Git commit/version information into the React build.

npm run build currently succeeds.

There are existing ESLint warnings in legacy files. They are not part of the feedback implementation unless a new change introduces additional warnings.

# Deployment

React is still deployed as a CRA static build using:

npm run deploy

The existing deploy command uploads build/ via FTP.

Important:

api/\*.php is NOT part of CRA build/.

PHP feedback backend files therefore need to be uploaded separately when they change.

Production API path:

https://privoz.kotucheniy.com.ua/api/feedback.php

Production admin:

https://privoz.kotucheniy.com.ua/api/feedback-admin.php

# Multiplayer testing flow

The start screen contains localized buttons for:

Create Game

Join Game

Languages currently supported:

en

ua

ru

es

CreateServerPage now uses:

window.location.origin

for invite URLs.

Therefore the same code generates correct URLs for both:

http://localhost:3000

and:

https://privoz.kotucheniy.com.ua

There should be no hardcoded localhost/production duplicate invite URLs.

After creating/starting the host, the UI provides a localized:

Add virtual player

button.

Virtual players are opened in separate browser windows.

The virtual-player URL automatically contains:

peer_id

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

# Rules page

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

# Important security/privacy decisions

Do not put SMTP passwords, admin passwords, tokens, PeerJS internals or other secrets into React REACT**APP**\* variables.

REACT**APP**\* values become public inside the frontend bundle.

Do not collect:

- cookies;

- arbitrary localStorage;

- arbitrary sessionStorage;

- passwords;

- auth tokens;

- .env contents;

- PeerJS internal objects.

Only explicitly useful Privoz diagnostic data should be included.

# Next major stage - Bot Player

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

SELECT_TRADER is a strong candidate for the first automated action because it already uses the host-authoritative action flow.

After that:

test

→ build

→ commit

Then expand the bot action-by-action.

Do not simultaneously refactor END_TURN, BUY_PRODUCT and all remaining gameplay actions while creating the initial bot infrastructure.

# Bot design questions for next session

Before implementation, inspect the current code and decide:

- where the bot controller should live;

- whether it should run in the virtual player's browser window or as another client/controller;

- how it identifies that it is a bot;

- how it observes gameState changes;

- how it determines whether it is allowed to act;

- how it avoids sending duplicate actions;

- how it uses normal gameAction/network messages;

- how deterministic choices can be made for testing;

- how bot actions can later be included in debug/feedback logs.

The first implementation should be deterministic and simple.

Examples:

choose the first legal trader;

choose a valid product based on available coins;

choose the first legal sector;

Randomness or strategy can be introduced later.

# Future game-core work

Still pending:

END_TURN host-authoritative refactor

and conversion of remaining legacy gameplay mutations/actions.

These tasks remain important, but they should not be mixed accidentally into the first bot infrastructure slice.

# Starting a new development session

At the beginning of the next ChatGPT session:

1. provide the current project ZIP or relevant files;

2. tell ChatGPT to read this file first:

docs/GAME_STATE.md

3. inspect the actual current source before making changes;

4. work from branch bot-player;

5. preserve the working prototype;

6. implement only one small bot vertical slice at a time.

Every accepted player decision should eventually produce a compact,

privacy-safe learning sample.

Learning data must represent only information available to the acting

player, legal actions available at that moment, the selected action,

and the eventual game outcome.

Human and bot decisions use the same learning format.

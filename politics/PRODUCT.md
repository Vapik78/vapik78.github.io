# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Friend groups** (the creator's Czech/Slovak circle and others like it) playing together on a party night: online, each on their own phone, or pass & play around one screen. The English interface lets anyone join.
- **Players on the open web** who find the game and play solo against AI rivals.

The job: draft a fantasy government of real politicians, outbid each other for every ministry, then find out whose cabinet handles the crises best.

## Product Purpose

Cabinet Clash is a party game: a live auction for real politicians from any era, followed by head-to-head cabinet duels. A good game produces three things:

1. **Laughs and arguments:** banter, pundit roasts, and debating who built the better government.
2. **Strategy that matters:** knowing politicians and bidding smart should beat luck.
3. **Learning:** players come away knowing more politicians and what each ministry actually does.

## Positioning

An English, browser-based take on the "fantasy government" auction games friends already play, with real politicians rated per ministry from their actual careers. It runs entirely free in the browser: no accounts, no server, and an AI pundit that runs on the player's own device.

## Operating Context

- Online rooms: one person hosts, friends join with a 4-letter code or invite link. The host's browser runs the game; a public MQTT relay only passes messages. The host must keep the page open.
- Pass & play: several people share one laptop or tablet.
- Solo: one player against AI rivals with six difficulty tiers.
- Sessions are social and time-boxed: a live bid timer, crisis rounds, then final standings and a room leaderboard across rematches.

## Capabilities and Constraints

- **Free, no accounts, no keys.** Static site on GitHub Pages (`vapik78.github.io/politics/`), plain HTML/CSS/JS with no build step. No logins, no API keys, no paid services. The AI pundit is either an in-browser model (WebLLM) or offline house templates.
- **Phone-first.** Online play happens on phones, so every screen must work well at phone width.
- **Deck and rules:** ~460 politicians from 66 countries, seven ministries (Leader, Economy, Foreign Affairs, Interior, Justice, Defence, Social Affairs), 1–9 skill ratings per ministry, deck modes (Legends, World, Countries, Continents, Modern, History), and house rules for budget, timer, discards, hints and duel type (Crisis responses, Crisis hand, Auto crises, Argue & vote).
- **Personal settings** are stored only on the player's device.
- Portraits come live from Wikipedia and flags from flagcdn; data saving mode turns portraits off.
- The creator commits and deploys by hand (GitHub Desktop).

## Brand Commitments

- Name: **Cabinet Clash**.
- Credit line: "Made by Marek Bureš with help from AI."
- Pundit voice: witty and roasting, but never mocking ethnicity, religion, gender, disability, appearance or deaths.
- The current broadsheet / campaign-poster look is the incumbent style. It was not confirmed as binding.

## Evidence on Hand

- Politician data with ratings, roles and years: `js/data.js`.
- Player and deploy guide: `README.md` in the creator's working folder.
- No testimonials, player counts, press or reviews exist. Do not fabricate any.

## Product Principles

1. **Neutral, not preachy.** Ratings measure competence in a job, not morality, and nothing endorses anyone. Figures known mainly for genocide stay out of the deck.
2. **Knowledge pays off.** Hidden information and ratings reward players who know their politicians; luck only adds spice.
3. **Fun out loud.** Features should spark talk at the table: reveals, roasts, rivalries, rematches.
4. **Zero friction.** Free, no sign-up, and fast from link to playing on any phone.
5. **Teach by playing.** Roles, ministries and profiles should leave players knowing more than they did.

## Accessibility & Inclusion

- Must work at phone width and with touch.
- Respect reduced-motion preferences (device setting or the in-game Reduce motion option) and offer a larger-text option.
- Light and dark themes.

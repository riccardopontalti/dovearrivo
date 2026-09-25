# Instructions for developing DoveArrivo

> The project was concluded as a v0.1 pilot on 25/09/2026 ([docs/STATUS.md](docs/STATUS.md)). Do not start new work unless the maintainer resumes it.

Read README, PRODUCT, ARCHITECTURE and ROUTING before writing code. Use DELIVERY to pick a ticket. The user's instructions take precedence.

## Language

- Code, identifiers, comments, docs, issues, pull requests and commit messages: English.
- User interface: Italian and English from the first release. No hard-coded UI strings outside the message catalogue.
- `README.it.md` is the Italian entry point; keep it consistent with `README.md`.

## Constraints

- No AI, generative API or model key in the service or in the scheduled pipeline.
- Build the pilot described here; add a dependency only for a demonstrated need.
- MOTIS v2.11.3 is the verified baseline. Pin versions, lockfiles and digests; never deploy `latest` tags.
- One TypeScript stack: SvelteKit app, API and data pipeline in the same repository. One adapter isolates every MOTIS quirk.
- Every published proposal satisfies all ROUTING constraints. Incomplete answers stay recognisable as such.
- Missing data, network outside coverage and service not found are different states.
- Never invent timetables, coordinates, licences, prices, accessibility or opening status of a destination.
- Never use public Nominatim for autocomplete, nor demo map servers in production. Geocoding comes from our own MOTIS instance.
- Do not store personal histories. No accounts in v0.1.
- Keep attributions and provenance. Do not commit large datasets or binaries.
- Do not describe as implemented anything that is still a specification.

## Working agreements

- Talk to the maintainer in Italian; keep code, docs and commits in English.
- Commit and push only after `npm run check`, `npm test` and `npm run test:e2e` all exit 0 (gate on the exit code). Run `npm run test:engine` when touching the MOTIS adapter.
- End commit messages with the `Co-Authored-By` trailer for AI agents: the project states openly that it is built with coding agents (README, "How this project is built").
- Purchases, accounts, DNS changes, publishing and messages to third parties are the maintainer's: prepare them and ask.
- Close each ticket with what works, the verification performed, the remaining limits, and a short "what I decided and why" for the maintainer.
- The repository is public: keep `README.md`, `README.it.md` and `docs/STATUS.md` in step with the live site at every ticket (status line, "what you can do today", roadmap, progress). Never describe as live what is not deployed.
- Current state and next steps: [docs/STATUS.md](docs/STATUS.md).

## Method

One ticket at a time: contract, implementation, check of the concrete risk, completion note. Prefer pure functions for filters and ranking. Use synthetic fixtures for edge cases and real data for integration.

Keep tests on time windows, returns, time zone, transfers and expired datasets. No tests that merely restate the code.

Close each ticket with: what works, verification performed, remaining limits. Update the docs when a decision changes. Work locally until external publication is authorised.

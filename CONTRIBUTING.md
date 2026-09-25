# Contributing to DoveArrivo

Contributions without code are valuable too: verify a destination entrance, report an ambiguous stop, compare a proposal with official timetables or test the site on a phone. Issues in Italian or English are welcome.

The project is in early development. See [DELIVERY](docs/DELIVERY.md) and pick a well-scoped ticket; describe the problem and the completion criterion in an issue.

## Reporting a problem

Include search date, origin, destination, filters, expected result and the data version shown by the site. Link the official timetable or source. Do not include personal data, location histories or screenshots identifying other people.

## Proposing a destination

Destinations live in [catalogue/destinations.yaml](catalogue/destinations.yaml), validated in CI against [its schema](catalogue/destinations.schema.json). You need: names and short original descriptions in Italian and English, a precise public entrance, the source of the coordinates, an information link and the date of the check. No copied text or photographs. A destination stays in draft until access and the walking route are verified.

## Changing code or documentation

Read [AGENTS.md](AGENTS.md). Write code, docs, commits and pull requests in English. A pull request addresses one problem and reports the resulting behaviour, the verification performed and remaining limits. Keep lockfiles, attributions and the API contract consistent.

Agents may prepare code and documentation; whoever proposes the contribution checks that results are true and reproducible. Original contributions follow the project's MIT licence; external data keep their own licences.

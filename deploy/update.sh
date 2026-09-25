#!/usr/bin/env bash
# Runs the data pipeline once and restarts MOTIS if a new snapshot was promoted.
# Called by dovearrivo-update.timer; exit codes follow pipeline/run.ts (2 = needs review).
set -uo pipefail
cd "$(dirname "$0")"

docker compose --profile jobs run --rm pipeline
code=$?

if [ -f ../data/pipeline/promoted ]; then
	rm -f ../data/pipeline/promoted
	docker compose restart motis
fi
exit $code

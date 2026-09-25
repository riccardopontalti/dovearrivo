#!/usr/bin/env bash
# Downloads the pinned MOTIS release (checksum verified) and imports the synthetic
# fixtures used by the engine contract tests. Start the server afterwards with:
#   .engine/bin/motis server -d .engine/data
set -euo pipefail

VERSION=2.11.3
case "$(uname -s)-$(uname -m)" in
	Linux-x86_64) ASSET=motis-linux-amd64.tar.bz2 SHA=0ffc7fc0633049edbcf88170ac037d2665ceaf1f0884a00b15f6c2b81313c825 ;;
	Darwin-arm64) ASSET=motis-macos-arm64.tar.bz2 SHA=c626683b52cc808a401a0b31a929523014ed4839b2ae72c700fcfefcd74e5baa ;;
	*) echo "No pinned MOTIS build for $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR="$ROOT/.engine"
mkdir -p "$DIR/bin"

if [ ! -x "$DIR/bin/motis" ]; then
	curl -fsSL -o "$DIR/$ASSET" "https://github.com/motis-project/motis/releases/download/v$VERSION/$ASSET"
	echo "$SHA  $DIR/$ASSET" | shasum -a 256 -c -
	tar -xjf "$DIR/$ASSET" -C "$DIR/bin"
fi

cp "$ROOT/research/synthetic-gtfs.zip" "$DIR/synthetic.zip"
rm -f "$DIR/after-midnight.zip"
(cd "$ROOT/tests/fixtures/gtfs-after-midnight" && zip -q -X "$DIR/after-midnight.zip" ./*.txt)

cat > "$DIR/config.yml" <<EOF
server:
  host: 127.0.0.1
  port: ${MOTIS_PORT:-8090}
timetable:
  first_day: "2026-09-24"
  num_days: 32
  datasets:
    syn:
      path: $DIR/synthetic.zip
      extend_calendar: false
    night:
      path: $DIR/after-midnight.zip
      extend_calendar: false
limits:
  plan_max_results: 128
  plan_max_search_window_minutes: 1440
  routing_max_timeout_seconds: 3
EOF

rm -rf "$DIR/data"
"$DIR/bin/motis" import -c "$DIR/config.yml" -d "$DIR/data" > "$DIR/import.log" 2>&1
echo "Imported fixtures into $DIR/data"

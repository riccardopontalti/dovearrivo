#!/usr/bin/env bash
# Builds the self-hosted basemap: a regional extract of a pinned Protomaps daily build,
# plus fonts (SIL OFL) and sprites (MIT-derived) from a pinned basemaps-assets commit.
# Output: ${BASEMAP_DIR:-data/basemap}/{basemap.pmtiles,fonts/,sprites/,basemap.json}
# Requires the `pmtiles` CLI (go-pmtiles), curl and unzip.
set -euo pipefail

BUILD=${PROTOMAPS_BUILD:-20260924}
ASSETS_COMMIT=028c18f713baecad011301ff7a69acc39bcc2ae7
BBOX=10.38,45.66,12.49,47.10 # same as the OSM clip in config/sources.yaml
MAXZOOM=14                   # MapLibre overzooms vector tiles; z15 would double the size

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=${BASEMAP_DIR:-$ROOT/data/basemap}
mkdir -p "$DIR"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pmtiles extract "https://build.protomaps.com/$BUILD.pmtiles" "$TMP/basemap.pmtiles" --bbox="$BBOX" --maxzoom="$MAXZOOM"
curl -fsSL -o "$TMP/assets.zip" "https://github.com/protomaps/basemaps-assets/archive/$ASSETS_COMMIT.zip"
unzip -q "$TMP/assets.zip" -d "$TMP"
ASSETS="$TMP/basemaps-assets-$ASSETS_COMMIT"

rm -rf "$DIR/fonts" "$DIR/sprites"
mkdir -p "$DIR/fonts"
for font in "Noto Sans Regular" "Noto Sans Medium" "Noto Sans Italic"; do
	cp -R "$ASSETS/fonts/$font" "$DIR/fonts/"
done
cp "$ASSETS/fonts/OFL.txt" "$DIR/fonts/"
cp -R "$ASSETS/sprites" "$DIR/sprites"
mv "$TMP/basemap.pmtiles" "$DIR/basemap.pmtiles"

SHA=$(shasum -a 256 "$DIR/basemap.pmtiles" | cut -d' ' -f1)
cat > "$DIR/basemap.json" <<JSON
{
	"version": "$BUILD-${SHA:0:12}",
	"protomapsBuild": "$BUILD",
	"assetsCommit": "$ASSETS_COMMIT",
	"bbox": [${BBOX}],
	"maxzoom": $MAXZOOM,
	"sha256": "$SHA",
	"attribution": "© OpenStreetMap contributors · Protomaps"
}
JSON
echo "Basemap ready in $DIR"

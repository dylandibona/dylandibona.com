#!/usr/bin/env bash
# Applies the rebuilt site to the Astro project.
# Run from inside the repo:  bash apply.sh
set -euo pipefail
cd "$(dirname "$0")"
[ -d .git ] || { echo "Run this from the dylandibona.com repo root."; exit 1; }

BASE="../starter content/prints/base-art"
[ -d "$BASE" ] || { echo "Cannot find $BASE — adjust BASE at the top of this script."; exit 1; }

echo "→ branch"
git checkout -b live 2>/dev/null || git checkout live

echo "→ removing the v12 build"
rm -rf src/components/cards src/components/RecipeModal.astro src/components/IdentityBar.astro \
       src/components/Welcome.astro src/scripts src/content/cocktails \
       src/data public/cocktails public/prints-lifestyle src/assets/astro.svg src/assets/background.svg \
       src/styles/global.css src/layouts/Layout.astro

echo "→ unpacking the new source"
tar xzf site-source.tar.gz

echo "→ copying the photographs"
mkdir -p src/assets/prints
while IFS='|' read -r slug file; do
  cp "$BASE/$file" "src/assets/prints/$slug.jpg"
done <<'MAP'
autumn-lines|Autumn Lines-Empty-Gesture.jpg
bar-a-vins|Bar a Vins.jpg
bar-bagatelle|bar bagatelle.jpg
cap-estel|Cap Estel.jpg
cat-scratch-fever|Cat Scratch Fever-Empty-Gesture.jpg
channel-cruise|Channel Cruise-Empty-Gesture.jpg
cloud-a|Cloud A-Empty-Gesture.jpg
editions-confluences|Editions Confluences-Empty-Gesture.jpg
escorca|Escorca.jpg
ferme|Fermé-Empty-Gesture.jpg
fern-fender|Fern Fender-empty-gesture.jpg
free-plays|Free Plays-Empty-Gesture.jpg
go-time|Go Time-Empty-Gesture-WEB.jpg
house-red|house-red-empty-gesture.jpg
indication|Indication.jpg
jazz-will|Jazz Will-Empty-Gesture.jpg
marseille|original marseille-sharepened.jpg
morning-inversion|morning-inversion-empty-gesture.jpg
negroni-time|Negroni Time.jpg
neighborhood-kook|neighborhood kook.jpg
over-nice|Over Nice-1-Empty-Gesture.jpg
quiet-line|Quiet Line-Empty-Gesture.jpg
red-flag|Red Flag-Empty-Gesture.jpg
saint-vincent|Saint Vincent-Empty-Gesture.jpg
talaia|Talaia-Empty-Gesture.jpg
tuba-club|Tuba Club.jpg
vesterbro|vesterbro.jpg
MAP
echo "   $(ls src/assets/prints | wc -l | tr -d ' ') photographs in place"

echo "→ done. Now:"
echo "   npm install && npm run dev"

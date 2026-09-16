#!/bin/sh
# Homepage backgrounds: each print master with its 250px printed border cropped
# off, 2400px on the long side, JPEG q88. The stage reads public/bg/<slug>.jpg.
# Run from the repo root after adding or replacing a master.
set -e
mkdir -p public/bg
for f in public/masters/jpg/*.jpg; do
  s=$(basename "$f" .jpg)
  magick "$f" -shave 250x250 -resize 2400x2400 -sampling-factor 4:4:4 -quality 88 "public/bg/$s.jpg"
  echo "public/bg/$s.jpg"
done

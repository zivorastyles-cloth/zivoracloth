#!/usr/bin/env bash
set -euo pipefail

MAX_BYTES=$((250 * 1024))

if [[ "${1-}" =~ ^[0-9]+$ ]]; then
  MAX_BYTES="$1"
fi

status=0

while IFS= read -r -d '' file; do
  size=$(wc -c < "$file")
  if (( size > MAX_BYTES )); then
    printf 'FAIL: %s is %d bytes (max %d)\n' "$file" "$size" "$MAX_BYTES"
    status=1
  else
    printf 'PASS: %s is %d bytes\n' "$file" "$size"
  fi
done < <(find . -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' -o -iname '*.webp' -o -iname '*.svg' \) -print0)

if (( status == 0 )); then
  printf 'All image files are within the %d-byte limit.\n' "$MAX_BYTES"
fi

exit "$status"

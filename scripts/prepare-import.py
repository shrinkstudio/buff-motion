#!/usr/bin/env python3
"""
Remap condensed blog CSV columns to match Webflow CMS field display names for import.
"""

import csv
import os

INPUT = os.path.expanduser("~/buff-motion/data/blogs-condensed.csv")
OUTPUT = os.path.expanduser("~/buff-motion/data/blogs-webflow-import.csv")

# Map our CSV column names → Webflow field display names
COLUMN_MAP = {
    "Name": "Title",
    "Slug": "Slug",
    "Draft": "Draft",
    "Archived": "Archived",
    "Created On": "Created On",
    "Updated On": "Updated On",
    "Published On": "Published On",
    "Page Introduction": "Summary",
    "Thumbnail Image": "Image",
    "Date of Publish": "Date",
    "Featured Post": "Featured?",
    "AI Summary": "AI Summary",
    "Author": "Author",
    "Header Image": "Header Image",
    "Body": "Body",
    "Next Post": "Next Post",
    "Category": "Category",
    "Meta Title": "Meta Title",
    "Meta Description": "Meta Description",
    "OG Title": "OG Title",
    "OG Description": "OG Description",
    "OG Image": "OG Image",
}

# Columns to drop (not needed for Webflow import)
DROP = {"Page Title"}

with open(INPUT, newline="", encoding="utf-8") as fin:
    reader = csv.DictReader(fin)
    rows = list(reader)

out_fields = [COLUMN_MAP.get(f, f) for f in reader.fieldnames if f not in DROP]

with open(OUTPUT, "w", newline="", encoding="utf-8") as fout:
    writer = csv.DictWriter(fout, fieldnames=out_fields)
    writer.writeheader()
    for row in rows:
        out = {}
        for old_key, val in row.items():
            if old_key in DROP:
                continue
            new_key = COLUMN_MAP.get(old_key, old_key)
            out[new_key] = val
        writer.writerow(out)

print(f"Wrote {len(rows)} posts → {OUTPUT}")
print(f"Columns: {', '.join(out_fields)}")

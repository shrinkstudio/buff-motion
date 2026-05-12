#!/usr/bin/env python3
"""
Condense Buff Motion blog CSV from 3 layouts into a single Body field.
Drops dead drafts (no layout set), adds SEO/OG fields, renames Team Member -> Author.
"""

import csv
import sys
import os

INPUT = os.path.expanduser("~/Downloads/Buff Motion - Blogs - 64e38dd56b026e9a2cd20155.csv")
OUTPUT = os.path.expanduser("~/buff-motion/data/blogs-condensed.csv")

OUTPUT_FIELDS = [
    "Name",
    "Slug",
    "Draft",
    "Archived",
    "Created On",
    "Updated On",
    "Published On",
    "Page Title",
    "Author",
    "Page Introduction",
    "Thumbnail Image",
    "Category",
    "Date of Publish",
    "Featured Post",
    "AI Summary",
    "Header Image",
    "Body",
    "Next Post",
    "Meta Title",
    "Meta Description",
    "OG Title",
    "OG Description",
    "OG Image",
]


def build_body_a(row):
    """Merge Layout A's fragmented fields into one rich text body."""
    parts = []

    # Header image as inline figure
    if row.get("Header Image (Layout A)"):
        caption = row.get("Header Image Caption (Layout A)", "")
        alt = caption if caption else "Article header"
        parts.append(
            f'<figure class="w-richtext-figure-type-image w-richtext-align-fullwidth">'
            f'<div><img src="{row["Header Image (Layout A)"]}" alt="{alt}" loading="lazy"></div>'
            + (f"<figcaption>{caption}</figcaption>" if caption else "")
            + "</figure>"
        )

    if row.get("Page Content #1 (Layout A)"):
        parts.append(row["Page Content #1 (Layout A)"])

    # First quote
    if row.get("Team Member Quote (Layout A)"):
        parts.append(row["Team Member Quote (Layout A)"])

    # Quote image
    if row.get("Quote Image (Layout A)"):
        parts.append(
            f'<figure class="w-richtext-figure-type-image w-richtext-align-fullwidth">'
            f'<div><img src="{row["Quote Image (Layout A)"]}" alt="Article content" loading="lazy"></div>'
            f"</figure>"
        )

    if row.get("Page Content #2 (Layout A)"):
        parts.append(row["Page Content #2 (Layout A)"])

    # Second quote
    if row.get("Team Member Quote #2 (Layout A)"):
        parts.append(row["Team Member Quote #2 (Layout A)"])

    # Bottom image
    if row.get("Bottom Image (Layout A)"):
        parts.append(
            f'<figure class="w-richtext-figure-type-image w-richtext-align-fullwidth">'
            f'<div><img src="{row["Bottom Image (Layout A)"]}" alt="Article content" loading="lazy"></div>'
            f"</figure>"
        )

    if row.get("Page Content #3 (Layout A)"):
        parts.append(row["Page Content #3 (Layout A)"])

    if row.get("Page Content #4 (Layout A) FAQ"):
        parts.append(row["Page Content #4 (Layout A) FAQ"])

    return "\n".join(p for p in parts if p.strip())


def build_body_b(row):
    """Layout B: single content field."""
    return row.get("Page Content (Layout B)", "")


def build_body_c(row):
    """Layout C: intro + content + CTA."""
    parts = []
    if row.get("Introduction Text (Layout C)"):
        parts.append(row["Introduction Text (Layout C)"])
    if row.get("Page Content (Layout C)"):
        parts.append(row["Page Content (Layout C)"])
    if row.get("Call to Action (Layout C)"):
        parts.append(row["Call to Action (Layout C)"])
    return "\n".join(p for p in parts if p.strip())


def is_dead_draft(row):
    """Dead draft = draft with no layout selected."""
    if row.get("Draft") != "true":
        return False
    return (
        row.get("Layout A") != "true"
        and row.get("Layout B") != "true"
        and row.get("Layout C") != "true"
    )


def process():
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    with open(INPUT, newline="", encoding="utf-8") as fin:
        reader = csv.DictReader(fin)
        rows_in = list(reader)

    dropped = 0
    rows_out = []

    for row in rows_in:
        if is_dead_draft(row):
            dropped += 1
            continue

        # Build body from whichever layout is active
        if row.get("Layout A") == "true":
            body = build_body_a(row)
        elif row.get("Layout B") == "true":
            body = build_body_b(row)
        elif row.get("Layout C") == "true":
            body = build_body_c(row)
        else:
            body = ""

        # Header image: use Layout A header, fall back to thumbnail
        header_image = row.get("Header Image (Layout A)", "") or row.get("Thumbnail Image", "")

        out = {
            "Name": row.get("Name", ""),
            "Slug": row.get("Slug", ""),
            "Draft": row.get("Draft", "false"),
            "Archived": row.get("Archived", "false"),
            "Created On": row.get("Created On", ""),
            "Updated On": row.get("Updated On", ""),
            "Published On": row.get("Published On", ""),
            "Page Title": row.get("Page Title", ""),
            "Author": row.get("Team Member (Meet the team ONLY)", ""),
            "Page Introduction": row.get("Page Introduction", ""),
            "Thumbnail Image": row.get("Thumbnail Image", ""),
            "Category": row.get("Category", ""),
            "Date of Publish": row.get("Date of Publish", ""),
            "Featured Post": row.get("Featured Post", "false"),
            "AI Summary": row.get("AI Summary (Plain Text)", ""),
            "Header Image": header_image,
            "Body": body,
            "Next Post": row.get("Next Post", ""),
            # SEO & OG fields — empty, to be filled per-post
            "Meta Title": "",
            "Meta Description": "",
            "OG Title": "",
            "OG Description": "",
            "OG Image": "",
        }
        rows_out.append(out)

    with open(OUTPUT, "w", newline="", encoding="utf-8") as fout:
        writer = csv.DictWriter(fout, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Input:   {len(rows_in)} posts")
    print(f"Dropped: {dropped} dead drafts")
    print(f"Output:  {len(rows_out)} posts -> {OUTPUT}")

    # Breakdown
    layouts = {"A": 0, "B": 0, "C": 0, "none": 0}
    drafts = 0
    for row in rows_out:
        if row["Draft"] == "true":
            drafts += 1
    print(f"Remaining drafts: {drafts}")


if __name__ == "__main__":
    process()

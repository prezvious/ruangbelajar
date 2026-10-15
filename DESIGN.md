# Ruang Belajar: Visual Direction

## Direction

An understated editorial study workspace, replacing the spreadsheet grid with
a weekly agenda and a single contextual reading panel. The user's brief calls
for a clean, orderly interface with few colors. No invented statistics,
decorative imagery, or calendar dates unsupported by the original curriculum.
The tracker extension uses charts only for actual user-entered tryout scores.

Interface copy must be direct and functional. Use descriptive page titles,
instructions, resource information, and factual status messages. Do not add
motivational slogans, inspirational taglines, or decorative encouragement.

Use only the Lucide collection from Iconify for interface icons, status markers,
completion states, topic bullets, and the favicon. Keep upstream SVG bodies in
icons.js and semantic aliases in app.js; do not mix other families or hand-drawn
glyphs. Use the collection's 24px viewBox, 2px strokes, and rounded line endings.
Icons inherit currentColor and remain decorative inside labeled controls.
Tiny circle markers may be filled through CSS. The standalone favicon.svg uses
lucide:calendar-days, not a book or brand-specific monogram. Retain semantic
HTML for text, buttons, inputs, and progress elements. Store upstream licensing
in third_party/lucide-LICENSE. No runtime Iconify/CDN connection is required.

## Tokens

| Token | Value | Purpose |
| --- | --- | --- |
| Canvas | `#ffffff` | Main workspace |
| Sidebar | `#f8f9f5` | Quiet navigation surface |
| Ink | `#292d25` | Primary text |
| Muted | `#6a6f63` | Supporting text |
| Line | `#e9ebe4` | Subtle separators |
| Olive | `#4d5d3c` | Selected controls and progress |
| Olive dark | `#39472e` | Focus panel |
| Tint | `#f0f3e9` | Selected agenda row |

Lora is the editorial heading face; DM Sans handles navigation and reading.
Use restrained olive accents, generous negative space, and consistent outlined
SVG icons. Most UI copy is 11-14px; the small subject badges are redundant with
their full names. Main heading scales between 26px and 49px.

## Layout And Behavior

- Persistent desktop sidebar; compact horizontal navigation on phones.
- Scrollable week selector, a seven-session agenda, and contextual details.
- One subject selected at a time, with completion controlled independently.
- Week 1 uses the introductory guide; later weeks follow the original daily
  subject order. Daily labels refer to a repeatable study rhythm, not dates.
- Completion feedback reflects actual local state, never demonstration values.
- Keyboard focus, skip navigation, reduced motion, and empty search states.
- Curriculum and tracker data are bundled in JavaScript; raw spreadsheet exports
  and their unused assets are removed. Keep source attribution and icon licensing.

## Integrated Tracker

The dashboard, curriculum checklist, profile, tryout history, and source guide
share the agenda shell, typography, separators, and outlined Lucide controls.
Use open sections and divided rows instead of spreadsheet grids or nested cards.
The checklist groups source subtopics with three independent stage buttons.
PK/PM shared topics have a single underlying state. Dashboard totals count unique
topics and stages, rather than averaging overlapping subject percentages.

Tryout forms stay inline; deleting a record requires an inline confirmation.
Charts are accessible SVG data visualizations, not interface icons. Empty states
contain no sample scores. Dates are user-entered, with no imported stale deadline.
Mobile navigation and chart plotting scroll independently without page overflow.

## Color Variants

One restrained accent family is active at a time; never mix all four in a page.
Theme tokens cover navigation, selected rows, progress, controls, and focus panels.

| Theme | Accent | Dark surface | Sidebar |
| --- | --- | --- | --- |
| Olive | #4d5d3c | #39472e | #f8f9f5 |
| Ocean | #3b6374 | #233f4b | #f5f8fa |
| Terracotta | #89553f | #603c2e | #faf7f3 |
| Plum | #725575 | #4e3851 | #faf7fa |

Theme choice persists independently of agenda and tracker data. Brand naming
remains unchanged until the user chooses a replacement.

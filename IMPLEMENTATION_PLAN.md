# Implementation plan

## Current product decision

The four PowerPoint decks are treated as exhibition collections:

- งานวัด
- ภาพดัง
- ผลงานนักเรียน
- มุมมอง

The four environmental topics from the original brief remain available as learning themes/tags. This keeps the exhibition structure clear while preserving the environmental learning framework.

## Completed in this pass

- Responsive Next.js + TypeScript app scaffold
- Mobile menu and five-item mobile bottom navigation
- Six-image Hero carousel sourced from the cover deck
- Content-driven JSON for categories, hero slides, environmental themes and Creative Lenses
- Imported 36 collection images and the Creative Lenses reference card
- Exhibition grids with real collection counts
- Full-screen gallery with category-bounded swipe, arrows, keyboard support and thumbnails
- Remix panel with source image, editable starter prompt and quick edits
- Chat Mode and Template Mode
- Local “My Works” persistence through localStorage
- Preview API flow for generate, remix, chat and gallery
- Server-only OpenRouter adapter with configurable model IDs and reference-image support
- Basic generation lock, session quota and rate-limit guardrails
- Dockerfile, Compose file, Caddy reverse proxy example and VPS runbook

## Next implementation checkpoints

1. Review and curate the four featured images in each collection.
2. Confirm or edit the draft title, caption, Creative Lens and message for each image.
3. Set the current OpenRouter model IDs in `.env` and run a low-cost end-to-end generation test.
4. Add durable gallery metadata and admin controls on top of the `/data` volume.
5. Deploy to the real VPS and run iPhone, Android and iPad Safari checks using the final QR URL.

## Content update workflow

1. Add or replace files in `public/content/<collection>/`.
2. Add the image record to `content/categories.json`.
3. Mark the curated four with the intended featured order.
4. Refresh locally or rebuild the container.

No component changes should be needed for ordinary content updates.

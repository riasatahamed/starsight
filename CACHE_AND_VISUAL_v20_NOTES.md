# StarSight v20 — Visual & Cache Improvements

## Visual
- Added subtle cinematic nebula-depth drift behind the app.
- Added restrained sky-map vignette for visual focus.
- Added small control micro-interactions and title illumination.
- Respects prefers-reduced-motion.

## Cache
- Service worker bumped to starsight-v20.
- Network-first for navigation and same-origin assets.
- Cache is now only an offline fallback instead of the primary source.
- Service worker registered with updateViaCache: 'none' and explicitly checked on load.
- Local JS/CSS/manifest/logo assets receive ?v=20 cache-busting URLs.
- Fixed the previous app-shell mismatch where expanded_stars.json was referenced even though the build contains expanded_stars.js.
- Live API endpoints remain uncached.

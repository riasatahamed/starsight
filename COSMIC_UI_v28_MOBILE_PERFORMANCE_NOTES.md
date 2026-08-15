# StarSight v28 — Mobile Performance Pass

- Adaptive 24/30 FPS mobile render budget with frame-time feedback.
- Mobile canvas DPR capped at 1.0 on low-end devices and 1.25 otherwise.
- Mobile star catalogue culling (4.0–4.5 mag) and cached star alt/az calculations.
- Planet and deep-sky astronomical positions cached between updates on mobile.
- Constellation lookup pre-indexed with a Map instead of repeated array searches.
- Mobile Milky Way uses a lightweight prebuilt brush path; desktop photorealistic path is unchanged.
- Photographic micro-halos, fine zodiacal-light sampling and expensive star PSF effects are reduced on mobile.
- AR labels dynamically reduced on mobile.
- Rendering pauses when the tab is hidden or a non-Sky page is active.
- Mobile CSS disables persistent backdrop-filter compositor effects.
- Cache/service-worker version bumped to v28.

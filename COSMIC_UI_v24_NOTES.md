# StarSight v23 — Cinematic Sky Refinements

- Location search is now a compact observing-location orb; the search drawer expands from the orb with a sleek bottom-origin animation.
- Removed the redundant home location HUD/search treatment.
- AR is a dedicated, more prominent home-screen control labelled AR and is no longer duplicated in the sky tool dock.
- Removed fullscreen controls because the Sky page is already immersive/full-screen by design.
- Added a home-screen Time control that opens time travel/timelapse controls without leaving the sky.
- Timelapse now advances from the existing requestAnimationFrame render loop instead of creating a second 33 Hz update/render loop. Expensive planet/moon and DOM refreshes are throttled while the sky remains smoothly rendered.
- Service worker cache bumped to v23.

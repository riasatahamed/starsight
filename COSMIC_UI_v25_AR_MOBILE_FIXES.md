# StarSight v25 — AR mobile sensor & UI fixes

- Mobile/tablet AR now uses device orientation data with compass heading when available.
- Manual drag freezes the current sensor pose and reveals **Follow Device**.
- Follow Device resumes sensor-driven AR and clears manual AR override.
- Camera AR is exposed only on mobile/tablet/coarse-pointer devices and keeps the live camera behind the transparent sky canvas.
- Manual drag remains available while the camera feed is active.
- AR bottom controls use safe-area-aware responsive layout and stack on very narrow screens to prevent clipping/overlap.
- Long observing-location names are ellipsized inside a fixed-width label so the location icon never shifts.
- Location search keeps fixed columns for the text field, location icon, and Search button.
- App/service-worker cache version bumped to v25 so the new JS/CSS are fetched after deployment.

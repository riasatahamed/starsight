# StarSight — Cosmic Journey v18

## Cosmic Journey improvements
- The selected object now starts at its real sky-map position and continuously scales into the destination render. This removes the visual impression of a separate large object appearing over the original small object.
- Destination rendering remains object-specific throughout the transition.
- Galaxy rendering now has a richer stellar population, irregular spiral structure, bulge, dust lanes, and photographic grain.
- Planet rendering now includes stronger limb shading, phase-aware illumination for Mercury/Venus, richer Jupiter turbulence and Great Red Spot, layered Saturn rings and Cassini gap, Mars terrain/polar cap, and subtle atmospheric bands on the outer planets.
- Curated, object-specific astronomy facts replace generic/random arrival comments for major stars, planets, Messier/NGC highlights, and common fallback object classes.
- Generic fallback text is derived from the object's actual catalog type/description rather than invented random commentary.
- Service-worker cache bumped to v18.

## v19 star journey fix
- Removed the selected target star from the background travelling-star field.
- The target is now rendered exactly once: as the continuously magnified journey object.
- This prevents the previous visual effect where a second large star appeared at/near the centre and seemed to shoot over and cover the original star.
- No astronomical coordinates, catalogue data, or journey timing were changed.

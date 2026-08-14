# StarSight — Photorealistic Rendering Update

Implemented in the existing StarSight rendering layer without changing the astronomical catalogue/positioning pipeline.

## Visual upgrades
- Photographic star PSF: tight core, colored atmospheric halo, subtle diffraction spikes for bright stars.
- Stellar colors continue to use catalogue temperature.
- Atmospheric extinction based on altitude and Bortle level.
- Multi-scale deterministic Milky Way cloud/dust rendering anchored in Galactic coordinates and projected through the real observer/time.
- Faint zodiacal-light band aligned to the ecliptic.
- Subtle night airglow and horizon scattering.
- Bortle-dependent horizon light-pollution dome.
- DSO brightness now receives the same altitude-dependent extinction.
- Existing scientifically calculated star/planet/DSO positions are untouched.

## Modes
- PHOTO: photorealistic rendering (default).
- SCI: original scientific-style rendering.

The PHOTO/SCI button is centered above the sky map. SUN remains on the left and AR VIEW remains on the right at the same vertical level; the compass remains below AR VIEW.

## Deployment
Use the files in this folder as the website root. The service-worker cache was bumped to `starsight-v8`.


Hotfix: replaced unsupported Astronomy.EquatorFromEcliptic call with an internal ecliptic-to-equatorial conversion so drawMap() cannot fail on that API call.

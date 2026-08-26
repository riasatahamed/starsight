# StarSight Milky Way v19 model

## Measured backbone

The preferred measured layer is a regionally stratified Gaia DR3 selection of
up to 1,000,000 stars. The builder divides the Galactocentric volume into
radial, azimuthal and vertical cells and retains the brightest sources in each
cell, then uses a global bright-star reserve to fill unused capacity.

This avoids the failure mode of a simple global `G < N` selection, which is
heavily dominated by the Solar neighbourhood.

## Visual reconstruction layers

The renderer uses XZ as the Galactic plane and Y as Galactic north.

- Stellar disk: approximately 100,000-light-year-class visible diameter.
- Thin disk: young/normal stellar population with a short scale height.
- Thick disk: older, vertically extended population.
- Bar/bulge: elongated central bar and broad bulge.
- Spiral arms: Scutum-Centaurus, Sagittarius-Carina, Perseus and Norma-Outer.
- Orion spur: local partial arm segment near the Solar circle.
- Molecular gas: clumpy, thin-plane emission-like distribution.
- HII regions: sparse red/pink star-forming emission-like knots concentrated
  in arm ridges.
- Globular clusters: halo-distributed compact warm clusters.
- Magellanic Clouds: explicit Large/Small satellite populations at their
  approximate Galactic directions and distances.
- Halo: sparse old stellar component surrounding the disk.
- Dust lanes: dark, elongated arm-following extinction-like particles.

The visual model is intentionally hybrid. Gaia stars remain at their measured
positions; modelled particles fill the unresolved/incomplete population.

## Why this is scientifically motivated

Gaia's DR3 sky maps show the flattened stellar disk, Galactic bulge/bar,
halo, dust extinction and nearby spiral-arm structure. Gaia DR3 also supports
3D stellar-nursery work through stellar positions and extinction. Large-scale
molecular-gas catalogues and Milky Way dust models provide additional
constraints on where gas and dust should appear.

The v19 renderer therefore does not claim that every synthetic particle is a
catalogued star. It explicitly separates measured Gaia stars from the
statistical reconstruction.

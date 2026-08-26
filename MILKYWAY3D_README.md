# StarSight Milky Way 3D — v33

## Galaxy rendering strategy

The Galaxy canvas is intentionally procedural-only. Sparse Gaia subsets are not rendered as the Galaxy-wide point population because they are too incomplete and locally biased to represent the full Milky Way.

The renderer uses:

- 1,200,000 procedurally generated stellar points
- adaptive mobile LOD with a device-aware cap
- thin and thick stellar disks
- barred central bulge
- four irregular spiral structures
- Orion spur
- molecular-cloud/HII-like gas
- dust lanes
- stellar halo
- globular-cluster-like population
- Large and Small Magellanic Cloud populations
- integrated stellar-light accumulation and blur
- resolved stellar points with soft cores

The procedural distribution is generated in Galactocentric 3D coordinates and is designed to reproduce the broad morphology, density gradients, colour populations and clumpy spiral structure of the Milky Way without pretending that individual procedural points are observed catalogue stars.

## Mobile performance

The realme 12 Pro+ uses a Snapdragon 7s Gen 2 with Adreno 710. v33 detects Adreno 710-class mobile renderers and caps the live procedural star draw at 1,000,000 points. It starts lower and raises the live budget while frame time is healthy; if frame time degrades it reduces the budget automatically.

The complete procedural catalogue is still 1.2M points. The adaptive renderer controls how many are actively drawn each frame so the visual quality can approach the phone's sustainable GPU limit without freezing the browser.

# Why StarSight selects Gaia stars regionally

A simple request for the globally brightest million Gaia sources is not a good
whole-Galaxy visual sample. Gaia observes from inside the Milky Way, so a
brightness-ranked sample is dominated by stars close to the Sun and by lines of
sight with low extinction.

StarSight v19 therefore divides the Galactocentric volume into many small
cells. Each cell keeps its brightest Gaia stars. The final budget is then
supplemented by a global bright-star reserve. This gives the renderer measured
stars from the inner disk, Solar circle, outer disk and vertical populations
instead of a single Solar-neighbourhood cloud.

This is a **rendering selection**, not a scientifically complete volume-limited
sample. The underlying Gaia source IDs and astrometry are retained in the
selection audit CSV, while the browser only needs the compact binary positions
and colours.

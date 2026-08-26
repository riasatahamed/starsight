# v27 Milky Way rendering strategy

This version changes the visual strategy rather than simply increasing particle counts.

- The galaxy remains fully 3D: every stellar population is rendered from Galactocentric XYZ points.
- The same reconstructed 3D stellar population is rendered twice:
  1. a very low-alpha, Gaussian unresolved-light pass using additive accumulation, which makes dense stellar populations integrate into a continuous Milky-Way-like luminous field;
  2. a small resolved-star pass for individual stellar texture.
- Real Gaia stars remain a separate catalogue layer and become more resolved as the camera approaches the Solar neighbourhood.
- Dust/gas/HII/cluster layers remain separate 3D populations.
- No flat 2D galaxy texture/card is used.
- The camera starts at a shallower oblique angle, closer to the photographic reference, while preserving full 3D orbit controls.

The goal is to reproduce the *appearance mechanism* of a deep-space galaxy photograph—integrated unresolved stellar light plus resolved stars, irregular arms, dust and star-forming regions—without replacing the underlying Milky Way geometry with a 2D image.

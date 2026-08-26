# v26 rendering approach

The Milky Way is rendered as a true 3D population, but the galaxy-wide presentation is now treated as unresolved stellar light rather than millions of individually bright white balls.

- Model stars use very soft Gaussian point sprites and much lower alpha at galaxy-wide distances.
- Their colors are biased toward blue-white stellar light, with the existing young/arm population retaining pink/blue structure.
- Real Gaia stars use smaller, softer sprites and remain a separate measured layer.
- Gas/HII/dust use normal alpha compositing to avoid additive white blowout.
- No flat 2D galaxy card is used.

The goal is to make the point population visually converge into the broad luminous disk, irregular spiral arms, central bulge/bar, and pink/blue star-forming regions seen in scientific Milky Way reconstructions, while retaining actual 3D coordinates for all measured and reconstructed populations.

# v31 rendering fix

The v30 integrated-light pass was visually over-dominant: additive accumulation into an RGBA8 buffer saturated dense regions toward white and the final blur strength washed out the arm colours.

v31 keeps the same 3D geometry and Gaia data but changes the balance:
- much lower integrated-light accumulation
- lower final blur contribution
- reduced central warm colour wash
- higher saturation in unresolved and resolved stellar layers
- stronger resolved star cores
- stronger blue/pink HII and gas contribution
- slightly stronger halo of bright stars

The result should preserve the photographic glow without allowing the integrated layer to erase the colour and structure of the Milky Way.

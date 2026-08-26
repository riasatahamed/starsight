# v25 rendering fix

The previous embedded renderer saturated the 3D point field: 450k model stars used additive blending and point sizes up to 22px, producing a white rectangular cloud. v25 uses alpha compositing for the reconstructed stellar population, much smaller point sprites, and lower gas/dust/HII opacity. The geometry and Gaia positions are unchanged.

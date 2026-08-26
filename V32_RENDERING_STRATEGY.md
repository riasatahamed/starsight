# v32 rendering strategy

This version separates observed and reconstructed stellar light more explicitly.

- Gaia DR3 stars remain individually resolvable and are slightly stronger at galaxy-wide scale.
- The 450k reconstructed stellar population is still present, but most of it is treated as unresolved stellar light.
- Only the brighter tail of the procedural population is drawn as individual resolved points.
- The full reconstructed population continues to feed the integrated 3D light pass.
- Integrated light is modestly brighter while retaining colour saturation.
- Dust, gas, HII, halo, clusters and the 3D barred multi-arm geometry are unchanged.

This is an intentional scientific distinction: Gaia points are observed catalogue sources; reconstructed points represent unresolved/modelled stellar populations and are not presented as individually observed stars.

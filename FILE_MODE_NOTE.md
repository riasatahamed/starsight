# v24 local-file compatibility

The previous versions depended on `fetch()` for the binary galaxy assets. Browsers commonly block those requests when the site is opened directly from `file://`, causing the Galaxy canvas to appear empty.

v24 embeds a compact, quantized, gzip-compressed copy of the generated 3D galaxy assets and the uploaded Gaia catalogue in `embedded-galaxy.js`. When served over HTTP the external binaries remain preferred; when opened directly from the extracted folder, the embedded assets are used.

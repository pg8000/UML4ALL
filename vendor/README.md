# ELK layout engine

`elk-0.12.0.js` is `lib/elk.bundled.js` from the official npm package `elkjs@0.12.0` (Eclipse Layout Kernel). Package tarball SHA-1: `7dc1bc71ab8f402d1b6564e2fa509ca1caee276c`. See `ELK-LICENSE.md` (EPL-2.0) for licensing and upstream notices. Source and documentation: https://github.com/kieler/elkjs/tree/v0.12.0 .

One compatibility patch makes the bundled GWT dispatcher prefer its existing CommonJS fake-worker export when `module.exports` exists. Without it, importing the browserified bundle inside our outer Web Worker installs an unrelated top-level message handler and leaves its internal Worker export undefined. The actual application Worker, timeout and security policies are unchanged.

It is served from this repository and imported into the disposable rendering Web Worker. There is no CDN or external layout service. Source/graph limits, the 3-second worker deadline, the SVG allowlist, and CSP remain in force. The application adapter is in `layout-elk.js`.

# Release and validation scripts

- `validate-release.mjs` checks version and tag consistency, the dated changelog entry, required
  policy, release-note, and roadmap files, package targets, and packaged renderer asset paths.
- `validate-publication-gates.mjs` enforces repository publication variables before a public
  release.
- `validate-roadmap-consistency.mjs` keeps the product roadmap and implementation authority in
  sync.
- `package-smoke.mjs` checks expected Windows and Linux artifacts, file size, and executable
  headers.
- `appimage-render-smoke.mjs` starts the packaged Linux renderer and requires visible app content.
- `generate-checksums.mjs` writes deterministic SHA-256 sums only for package-version-matched
  release assets and the SBOM.

Use the package scripts in `package.json` instead of calling these files directly unless you are
debugging a focused validation step.

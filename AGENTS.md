# AGENTS.md — AI Assistant Guide for the abap2UI5 reuse custom control

> This file follows the cross-tool AGENTS.md convention and is the single
> agent instruction file of this repository. `CLAUDE.md` next to it is a
> pointer at this file, nothing more.

## What this repository is

The source of the npm package **`@abap2ui5/reuse-custom-control`**
(`packages/reuse-custom-control`): the UI5 custom control
`z2ui5.reuse.Container`, which runs an abap2UI5 app - an ABAP class
implementing `z2ui5_if_app` - inside any UI5 app. Next to it an example app
(`examples/host-app`) that consumes the package the way an app from the
registry would, and Playwright tests (`test/e2e`) that drive that example
against a live abap2UI5 backend.

**Language:** English for all code, comments, docs, commit messages, PRs.

## Never edit `packages/reuse-custom-control/frontend/`

It is the abap2UI5 frontend - the `z2ui5` UI5 component the control wraps -
copied by `scripts/sync-frontend.mjs` from
[abap2UI5 `app/webapp`](https://github.com/abap2UI5/abap2UI5/tree/main/app/webapp)
at the commit in `A2UI5_PIN`. It is git-ignored and overwritten by every
sync. A change the control needs from the frontend (an `embedded` flag, an
`endpoint` setting, ...) is a pull request to abap2UI5; once merged, bump
`A2UI5_PIN` here. Do not patch the copy, and do not work around a frontend
limitation in the control when the fix belongs in abap2UI5 - say so instead.

## Layout

| Path | |
|---|---|
| `A2UI5_PIN` | Full sha of the abap2UI5 commit the package ships |
| `scripts/sync-frontend.mjs` | Copies `app/webapp` at the pin (or `ABAP2UI5_DIR`) into `frontend/`, builds its `Component-preload.js` |
| `packages/reuse-custom-control/ui5.yaml` | UI5 CLI project of type `module`: `/resources/z2ui5/reuse/` → `src/`, `/resources/z2ui5/` → `frontend/` |
| `packages/reuse-custom-control/src/` | The control (`Container.js`) and its stylesheet |
| `packages/reuse-custom-control/README.md` | The consumer documentation - what npm shows |
| `examples/host-app/` | The example: a plain UI5 app, `ui5-middleware-simpleproxy` to the backend, `lib/sameOrigin.js` for the backend's CSRF check |
| `test/e2e/` | Playwright tests of the example |
| `.github/workflows/` | `ci.yaml` (checks + e2e), `publish.yaml` (npm, on a GitHub release) |

## Rules for `src/`

- **UI5 1.71 is the floor**, as in abap2UI5. Use no module, class, property or
  enum newer than 1.71, and no `sap/ui/core/Lib` / `sap/ui/core/Element`
  static APIs. What the control uses today and since when:
  `sap/base/util/LoaderExtensions` and `sap/ui/dom/includeStylesheet` (1.58),
  `ComponentContainer#lifecycle` (1.56), renderer `apiVersion: 2` (1.67).
  The e2e tests run the example on 1.71 too (`examples/host-app/ui5-1.71.yaml`,
  the `ui5-1.71` Playwright project) - a change to `src/` is done when both
  projects pass.
- **Keep the control thin.** It picks the class, the endpoint and the size;
  everything the app does comes from the backend through the component.
- **One component per control, one backend session per component.** A change
  of `app`, `endpoint` or `params` replaces the component; nothing is patched
  into a running one.
- **No inline styles for descendants and no `eval`**: a host with a strict
  Content-Security-Policy must need nothing extra. Styles go into
  `Container.css`, scoped under `.z2ui5ReuseContainer`.
- A UI5 module id is case-sensitive and a wrong one only fails in the browser
  (`includeStylesheet`, not `includeStyleSheet`) - run the e2e tests.

## Validation

```bash
npm ci
npm run lint && npm run format:check
npm run build          # ui5 build --all of the example
npm run pack:check     # package contents
npx playwright test    # needs the abap2UI5 backend on :3000 - see README
```

All text files are LF-only, formatted with Prettier (`.prettierrc`).

## Publishing

A GitHub release `v<version>` publishes the version in
`packages/reuse-custom-control/package.json` (`publish.yaml`, `NPM_TOKEN`).
Never publish a build synced from `ABAP2UI5_DIR`.

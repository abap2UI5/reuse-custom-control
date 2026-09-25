# AGENTS.md — AI Assistant Guide for @abap2ui5/embed

> This file follows the cross-tool AGENTS.md convention and is the single
> agent instruction file of this repository. `CLAUDE.md` next to it is a
> pointer at this file, nothing more.

## What this repository is

The source of the npm package **`@abap2ui5/embed`**
(`packages/embed`): the UI5 custom control
`z2ui5.reuse.Container`, which runs an abap2UI5 app - an ABAP class
implementing `z2ui5_if_app` - inside any UI5 app. Next to it an example app
(`examples/host-app`) that consumes the package the way an app from the
registry would, and Playwright tests (`test/e2e`) that drive that example
against a live abap2UI5 backend.

**Language:** English for all code, comments, docs, commit messages, PRs.

## Never edit `packages/embed/frontend/`

It is the abap2UI5 frontend - the `z2ui5` UI5 component the control wraps -
copied by `scripts/sync-frontend.mjs` from
[abap2UI5 `app/webapp`](https://github.com/abap2UI5/abap2UI5/tree/main/app/webapp)
at the commit in `A2UI5_PIN`. It is git-ignored and overwritten by every
sync. A change the control needs from the frontend (an `embedded` flag, an
`endpoint` setting, ...) is a pull request to abap2UI5; once merged, bump
`A2UI5_PIN` here. Do not patch the copy, and do not work around a frontend
limitation in the control when the fix belongs in abap2UI5 - say so instead.

## Layout

| Path                                      |                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `A2UI5_PIN`                               | Full sha of the abap2UI5 commit the package ships                                                                                             |
| `scripts/sync-frontend.mjs`               | Copies `app/webapp` at the pin (or `ABAP2UI5_DIR`) into `frontend/`, builds its `Component-preload.js`                                        |
| `packages/embed/ui5.yaml`  | UI5 CLI project of type `module`: `/resources/z2ui5/reuse/` → `src/`, `/resources/z2ui5/` → `frontend/`                                       |
| `packages/embed/src/`      | The control (`Container.js`) and its stylesheet                                                                                               |
| `packages/embed/README.md` | The consumer documentation - what npm shows                                                                                                   |
| `examples/host-app/`                      | The example: a plain UI5 app, `ui5-middleware-simpleproxy` to the backend, `lib/sameOrigin.js` for the backend's CSRF check                   |
| `test/e2e/`                               | Playwright tests of the example                                                                                                               |
| `scripts/build-branches.mjs`              | Builds the four branches of [abap2UI5/frontend-cc](https://github.com/abap2UI5/frontend-cc) into the git-ignored `out/` (see below)           |
| `scripts/abap2ui5.mjs`                    | Where both scripts get abap2UI5 from: the pin, or `ABAP2UI5_DIR`                                                                              |
| `scripts/branch-stamp.mjs`                | The provenance (`VERSION`, README banner) of a frontend-cc branch, written at deploy time                                                     |
| `delivery/README.md`                      | The README of every frontend-cc branch and of its `main`                                                                                      |
| `.github/workflows/`                      | `ci.yaml` (checks, frontend-cc trees, e2e), `publish.yaml` (npm, on a GitHub release), `frontend_cc_deploy.yaml` (the trees into frontend-cc) |

## Rules for `src/`

- **UI5 1.71 is the floor**, as in abap2UI5. Use no module, class, property or
  enum newer than 1.71, and no `sap/ui/core/Lib` / `sap/ui/core/Element`
  static APIs. What the control uses today and since when:
  `sap/ui/dom/includeStylesheet` (1.58), `ComponentContainer#lifecycle`
  (1.56), renderer `apiVersion: 2` (1.67).
  The e2e tests run the example on 1.71 too (`examples/host-app/ui5-1.71.yaml`,
  the `ui5-1.71` Playwright project) - a change to `src/` is done when both
  projects pass.
- **Keep the control thin.** It picks the class, the endpoint and the size;
  everything the app does comes from the backend through the component. It
  configures the component only through what the frontend reads itself -
  `componentData.startupParameters` and `componentData.endpoint` (abap2UI5
  `Component.init`) - never by patching the manifest or reaching into the
  component's state.
- **One component per control, one backend session per component.** A change
  of `app`, `endpoint` or `params` replaces the component; nothing is patched
  into a running one.
- **No inline styles for descendants and no `eval`**: a host with a strict
  Content-Security-Policy must need nothing extra. Styles go into
  `Container.css`, scoped under `.z2ui5ReuseContainer`.
- A UI5 module id is case-sensitive and a wrong one only fails in the browser
  (`includeStylesheet`, not `includeStyleSheet`) - run the e2e tests.

## The frontend-cc branches

`npm run branches` builds `standard`, `standard_v2` (BSP `Z2UI5_CC` with its
own ICF node and handler), `cloud` and `cloud_v2` (the example's UI5 project
in `app/`) - the example with the control and the abap2UI5 frontend vendored
into `frontend/`, delivered like abap2UI5/frontend delivers the frontend.

- **frontend-cc is a delivery repository.** Nothing there is edited by hand;
  a change to a branch is a change to the example, the control,
  `scripts/build-branches.mjs` or `delivery/README.md` here.
- **The BSP tooling is abap2UI5's, at the pin** (`tools/app2bsp`,
  `tools/bsp_rename`, `tools/check-pages.mjs`, `tools/app2app_v2/patch-v2.mjs`,
  `frontend/abap/standard`). Do not copy or re-implement it here; a fix to it
  is a pull request to abap2UI5 and a pin bump.
- **Every patch of the example is guarded** (`mustReplace` and the explicit
  checks in `assembleWebapp`): if a change to `examples/host-app` breaks one,
  adapt the build in the same pull request - do not loosen the guard.
- **The build is deterministic and unstamped.** Identical sources give
  identical trees; the commit is stamped only by the deploy
  (`branch-stamp.mjs`), which relies on that to skip unchanged deliveries.

## Validation

```bash
npm ci
npm run lint && npm run format:check
npm run build          # ui5 build --all of the example
npm run pack:check     # package contents
npm run branches       # the frontend-cc trees, BSP page invariants included
npx playwright test    # needs the abap2UI5 backend on :3000 - see README
```

All text files are LF-only, formatted with Prettier (`.prettierrc`).

## Publishing

A GitHub release `v<version>` publishes the version in the package's
`package.json` (`publish.yaml`) by **trusted publishing** - OIDC with
provenance, no token. npm lets a package be pointed at a workflow only once
the package exists, so the first version is published by hand once
(`npm login`, `npm run sync -- --force && npm run build`, then
`npm publish --workspace packages/<the package> --access public`), and the
package's Settings → Trusted Publisher on npmjs.com is pointed at this
repository and `publish.yaml`. Until then the workflow's publish step ends in
a warning naming the bootstrap; once the package exists on the registry, a
failed publish is an error. Never publish a build synced from `ABAP2UI5_DIR`.

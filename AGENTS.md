# AGENTS.md — AI Assistant Guide for abap2UI5/embed

> This file follows the cross-tool AGENTS.md convention and is the single
> agent instruction file of this repository. `CLAUDE.md` next to it is a
> pointer at this file, nothing more.

## What this repository is

The example and the delivery of **embedding abap2UI5 apps in a UI5 app**.
The control that does it, `z2ui5.reuse.Container`, is NOT written here: it
lives in abap2UI5 (`app/webapp/reuse/Container.js`) and ships with the
frontend as the npm package
[`@abap2ui5/embed-control`](https://www.npmjs.com/package/@abap2ui5/embed-control).
This repository holds what uses it:

- `examples/host-app` - a plain UI5 app that depends on
  `@abap2ui5/embed-control` the way any app from the registry would, and
  places the control three times
- `test/e2e` - Playwright tests that drive that example against a live
  abap2UI5 backend, on UI5 1.136 and 1.71
- `scripts/build-branches.mjs` - the build of
  [abap2UI5/frontend-cc](https://github.com/abap2UI5/frontend-cc), the example
  delivered ready to install

The control was written here, as the npm package `@abap2ui5/embed` (first
`@abap2ui5/reuse-custom-control`), and moved into abap2UI5 before it was ever
published: 7 kB do not earn a package and a version pin of their own, and
next to the component it wraps the two can never be of different releases.
Nothing is published from this repository.

**Language:** English for all code, comments, docs, commit messages, PRs.

## One pin: the `@abap2ui5/embed-control` version

`examples/host-app/package.json` depends on `@abap2ui5/embed-control` at an
**exact** version. That package records its abap2UI5 commit under
`abap2ui5.commit`, and `scripts/abap2ui5.mjs` reads it from there for the
frontend-cc build; the e2e job installs first and builds the backend from the
same commit. So the example, the tests and the delivered branches can never
pair different frontends. It used to be two pins - `A2UI5_PIN` and a copy of
the webapp synced from it - kept in step by hand.

A change the example needs from the control or the frontend (an `embedded`
flag, a new property, ...) is a pull request to abap2UI5; once released, bump
the dependency here and `npm install` for the lockfile. Do not work around a
limitation of the control in the example when the fix belongs in abap2UI5 -
say so instead. The rules for the control itself (UI5 1.71 floor, thin, one
component per control, no inline styles, no `eval`) are in abap2UI5 with the
control and its spec.

## Layout

| Path | |
| --- | --- |
| `examples/host-app/` | The example: a plain UI5 app, `ui5-middleware-simpleproxy` to the backend, `lib/sameOrigin.js` for the backend's CSRF check |
| `test/e2e/` | Playwright tests of the example |
| `scripts/build-branches.mjs` | Builds the four branches of [abap2UI5/frontend-cc](https://github.com/abap2UI5/frontend-cc) into the git-ignored `out/` (see below) |
| `scripts/abap2ui5.mjs` | Where the scripts get abap2UI5 from: the commit `@abap2ui5/embed-control` records, or `ABAP2UI5_DIR` |
| `scripts/branch-stamp.mjs` | The provenance (`VERSION`, README banner) of a frontend-cc branch, written at deploy time |
| `delivery/README.md` | The README of every frontend-cc branch and of its `main` |
| `.github/workflows/` | `ci.yaml` (checks, frontend-cc trees, e2e), `frontend_cc_deploy.yaml` (the trees into frontend-cc) |

## The frontend-cc branches

`npm run branches` builds `standard`, `standard_v2` (BSP `Z2UI5_CC` with its
own ICF node and handler), `cloud` and `cloud_v2` (the example's UI5 project
in `app/`) - the example with the abap2UI5 frontend, control included,
vendored into `frontend/`, delivered like abap2UI5/frontend delivers the
frontend.

- **frontend-cc is a delivery repository.** Nothing there is edited by hand;
  a change to a branch is a change to the example,
  `scripts/build-branches.mjs` or `delivery/README.md` here - or to the
  control in abap2UI5 and a bump of the pin.
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
npm run branches       # the frontend-cc trees, BSP page invariants included
npx playwright test    # needs the abap2UI5 backend on :3000 - see README
```

The e2e tests run the example on UI5 1.71 too (`examples/host-app/ui5-1.71.yaml`,
the `ui5-1.71` Playwright project); a change here is done when both projects
pass. All text files are LF-only, formatted with Prettier (`.prettierrc`).

# abap2UI5 embed

Home of **[`@abap2ui5/embed`](packages/embed)**:
a UI5 custom control, published on npm, that runs an
[abap2UI5](https://github.com/abap2UI5/abap2UI5) app inside any UI5 app, plus
an **[example app](examples/host-app)** that shows how to use it.

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:z2ui5="z2ui5.reuse">
  <z2ui5:Container app="Z2UI5_CL_UI5_APP_HI_WORLD" height="400px"/>
</mvc:View>
```

How to use the package is in its [README](packages/embed/README.md)
(also what npm shows). This file is about working on it.

## Layout

```
A2UI5_PIN                      abap2UI5 commit whose frontend the package ships
scripts/sync-frontend.mjs      brings that frontend into the package
scripts/build-branches.mjs     builds the abap2UI5/frontend-cc branches (out/, git-ignored)
packages/embed/ the npm package - a UI5 CLI project of type "module"
  src/                           the control (written here)
  frontend/                      the abap2UI5 frontend (generated, git-ignored)
examples/host-app/             a plain UI5 app using the package like any consumer
delivery/README.md             the README of every frontend-cc branch
test/e2e/                      Playwright tests of the example against a live backend
```

The two workspaces are linked by npm: the example depends on
`@abap2ui5/embed@^0.1.0` exactly as an app from the registry
would, and npm resolves it to `packages/embed`.

## The frontend is not written here

The control is a thin wrapper around the `z2ui5` UI5 component - the whole
abap2UI5 frontend. Its only source is
[`app/webapp`](https://github.com/abap2UI5/abap2UI5/tree/main/app/webapp) in
abap2UI5. `npm run sync` copies it from the commit in `A2UI5_PIN` into
`packages/embed/frontend/` and builds its
`Component-preload.js`; that folder is git-ignored and overwritten on every
sync. A change to the frontend is a pull request to abap2UI5, followed by a
bump of `A2UI5_PIN` here.

To try an unmerged abap2UI5 change, point the sync at a local checkout:
`ABAP2UI5_DIR=../abap2UI5 npm run sync` (it warns that the result is not the
pinned commit - do not publish it).

## Run the example

It needs an abap2UI5 backend. Without an SAP system, run abap2UI5 transpiled
to JavaScript in Node, from an abap2UI5 checkout (the first build takes a few
minutes):

```bash
git clone https://github.com/abap2UI5/abap2UI5.git && cd abap2UI5
npm ci && npm run downport && npm run auto_transpile
npm run express                  # abap2UI5 on http://localhost:3000
```

Then, here:

```bash
npm install
npm start                        # sync + ui5 serve, opens the example
```

Against a real system instead: copy `examples/host-app/.env.example` to
`.env` and set the system's URL and user there.

## Checks

| Command | |
|---|---|
| `npm run lint` / `npm run format:check` | ESLint and Prettier |
| `npm run build` | `ui5 build --all` of the example - proves a consumer build picks the package up |
| `npm run pack:check` | what `npm publish` would put into the package |
| `npm run branches` | the four frontend-cc trees in `out/`, with abap2UI5's BSP page invariants |
| `npx playwright test` | the example in a browser on UI5 1.136 and 1.71, against the backend on port 3000 (`PW_CHROMIUM_PATH` for an installed Chromium) |

CI (`.github/workflows/ci.yaml`) runs all of them; its e2e job builds the
backend from the pinned abap2UI5 commit.

## Publish

Create a GitHub release. `publish.yaml` syncs the frontend at `A2UI5_PIN`,
runs the checks and publishes the package with npm provenance. It needs the
`NPM_TOKEN` secret of an npm user who may publish to the `@abap2ui5` scope;
without it the job stops with a message instead of publishing.

## Delivery: abap2UI5/frontend-cc

The example is also delivered ready to install, with the control and the
abap2UI5 frontend vendored into it, as the four branches of
[abap2UI5/frontend-cc](https://github.com/abap2UI5/frontend-cc) - built the
way [abap2UI5/frontend](https://github.com/abap2UI5/frontend) delivers the
frontend alone:

| Branch | |
|---|---|
| `standard` | BSP `Z2UI5_CC` with its own HTTP service `/sap/bc/z2ui5_cc` (handler `Z2UI5_CC_CL_LP_HANDLER`), classic bootstrap - pulled with abapGit |
| `standard_v2` | the same, legacy-free bootstrap (UI5 2.x from the CDN) |
| `cloud` | the example's UI5 project in `app/`, deployed to ABAP Cloud with the UI5 tooling; talks to the HTTP service `Z2UI5` of abap2UI5/frontend's `cloud` branch |
| `cloud_v2` | the same, legacy-free bootstrap |

`npm run branches` (`scripts/build-branches.mjs`) builds all four into the
git-ignored `out/`. Every tree carries one webapp: the example at the root,
the abap2UI5 frontend at `A2UI5_PIN` with the control in `frontend/` (the
z2ui5 namespace, registered at `./frontend/` - a deployed app cannot serve its
own files under `resources/`), and `frontend/preload.js`, the bundle the page
boots through. The BSP branches go through abap2UI5's own tools at the pin -
`app2bsp` for the bundle and the pages, `bsp_rename` for the name, and its
page invariants (`check-pages.mjs`) run on every build. Every patch the build
makes to the example is guarded: a change to `index.html`, `manifest.json`,
`package.json` or `ui5.yaml` there that the build no longer recognises fails
it instead of delivering something half-patched.

On a push to `main` that touches what the build consumes,
`frontend_cc_deploy.yaml` builds the trees, stamps them
(`scripts/branch-stamp.mjs`) and writes them as `result/<branch>` into one
commit on frontend-cc's `main`, together with its `README.md` from
`delivery/README.md`; frontend-cc's `deliver` workflow fans each folder out
into its branch. The push needs the `ACTION_KEY_FRONTEND_CC` secret: the
private half of a deploy key with write access on frontend-cc.

## Next steps

What is still open is tracked in abap2UI5 as the
[embed-as-reuse-component](https://github.com/abap2UI5/abap2UI5/blob/main/backlog/items/embed-as-reuse-component.md)
backlog item: an embedded mode of the frontend that leaves page-wide things
(busy indicator, title, favicon, hash, `sap.m.App` root) to the host app. The
control forwards it once abap2UI5 has it.

## License

MIT

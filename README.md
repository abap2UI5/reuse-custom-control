# abap2UI5 embed

The example and the delivery of **embedding
[abap2UI5](https://github.com/abap2UI5/abap2UI5) apps in a UI5 app** with the
control `z2ui5.reuse.Container`:

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:z2ui5="z2ui5.reuse">
  <z2ui5:Container app="Z2UI5_CL_UI5_APP_HI_WORLD" height="400px"/>
</mvc:View>
```

The control ships with the abap2UI5 frontend, in the npm package
[`@abap2ui5/embed-control`](https://www.npmjs.com/package/@abap2ui5/embed-control)
- how to use it is in that package's README. It lives in abap2UI5
(`app/webapp/reuse/`); it was written here and moved there before it was
ever published. This repository holds the **[example app](examples/host-app)**
that uses it, its browser tests, and the build of the ready-to-install
delivery, [abap2UI5/frontend-cc](https://github.com/abap2UI5/frontend-cc).

## Layout

```
examples/host-app/             a plain UI5 app using @abap2ui5/embed-control like any consumer
test/e2e/                      Playwright tests of the example against a live backend
scripts/build-branches.mjs     builds the abap2UI5/frontend-cc branches (out/, git-ignored)
delivery/README.md             the README of every frontend-cc branch
```

## One pin

`examples/host-app/package.json` depends on `@abap2ui5/embed-control` at an
exact version, and that version is the one pin in this repository: the
package records its abap2UI5 commit, which the frontend-cc build and the e2e
backend read (`scripts/abap2ui5.mjs`). A change to the control or the
frontend is a pull request to abap2UI5, a release there, then a bump of the
dependency here.

To try an unmerged abap2UI5 change, pack it there and install the tarball
here - `npm run pack:embed-control` in abap2UI5, then
`npm install ../abap2UI5/npm-package/abap2ui5-embed-control-*.tgz --workspace examples/host-app`
(do not commit the resulting `file:` dependency). For the frontend-cc build,
`ABAP2UI5_DIR=../abap2UI5 npm run branches` takes the tools from a checkout.

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
npm start                        # ui5 serve, opens the example
```

Against a real system instead: copy `examples/host-app/.env.example` to
`.env` and set the system's URL and user there.

## Checks

| Command | |
|---|---|
| `npm run lint` / `npm run format:check` | ESLint and Prettier |
| `npm run build` | `ui5 build --all` of the example - proves a consumer build picks the package up |
| `npm run branches` | the four frontend-cc trees in `out/`, with abap2UI5's BSP page invariants |
| `npx playwright test` | the example in a browser on UI5 1.136 and 1.71, against the backend on port 3000 (`PW_CHROMIUM_PATH` for an installed Chromium) |

CI (`.github/workflows/ci.yaml`) runs all of them; its e2e job builds the
backend from the abap2UI5 commit `@abap2ui5/embed-control` records.

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
the abap2UI5 frontend at the commit `@abap2ui5/embed-control` records, control included, in `frontend/` (the
z2ui5 namespace, registered at `./frontend/` - a deployed app cannot serve its
own files under `resources/`), and `frontend/preload.js`, the bundle the page
boots through. The BSP branches go through abap2UI5's own tools at that commit -
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
control forwards it once abap2UI5 has it, and the example shows it here.

## License

MIT

# abap2UI5 reuse custom control

Home of **[`@abap2ui5/reuse-custom-control`](packages/reuse-custom-control)**:
a UI5 custom control, published on npm, that runs an
[abap2UI5](https://github.com/abap2UI5/abap2UI5) app inside any UI5 app, plus
an **[example app](examples/host-app)** that shows how to use it.

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:z2ui5="z2ui5.reuse">
  <z2ui5:Container app="Z2UI5_CL_UI5_APP_HI_WORLD" height="400px"/>
</mvc:View>
```

How to use the package is in its [README](packages/reuse-custom-control/README.md)
(also what npm shows). This file is about working on it.

## Layout

```
A2UI5_PIN                      abap2UI5 commit whose frontend the package ships
scripts/sync-frontend.mjs      brings that frontend into the package
packages/reuse-custom-control/ the npm package - a UI5 CLI project of type "module"
  src/                           the control (written here)
  frontend/                      the abap2UI5 frontend (generated, git-ignored)
examples/host-app/             a plain UI5 app using the package like any consumer
test/e2e/                      Playwright tests of the example against a live backend
```

The two workspaces are linked by npm: the example depends on
`@abap2ui5/reuse-custom-control@^0.1.0` exactly as an app from the registry
would, and npm resolves it to `packages/reuse-custom-control`.

## The frontend is not written here

The control is a thin wrapper around the `z2ui5` UI5 component - the whole
abap2UI5 frontend. Its only source is
[`app/webapp`](https://github.com/abap2UI5/abap2UI5/tree/main/app/webapp) in
abap2UI5. `npm run sync` copies it from the commit in `A2UI5_PIN` into
`packages/reuse-custom-control/frontend/` and builds its
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
| `npx playwright test` | the example in a browser on UI5 1.136 and 1.71, against the backend on port 3000 (`PW_CHROMIUM_PATH` for an installed Chromium) |

CI (`.github/workflows/ci.yaml`) runs all of them; its e2e job builds the
backend from the pinned abap2UI5 commit.

## Publish

Create a GitHub release. `publish.yaml` syncs the frontend at `A2UI5_PIN`,
runs the checks and publishes the package with npm provenance. It needs the
`NPM_TOKEN` secret of an npm user who may publish to the `@abap2ui5` scope;
without it the job stops with a message instead of publishing.

## Next steps

What is still open is tracked in abap2UI5 as the
[embed-as-reuse-component](https://github.com/abap2UI5/abap2UI5/blob/main/backlog/items/embed-as-reuse-component.md)
backlog item: an embedded mode of the frontend that leaves page-wide things
(busy indicator, title, favicon, hash, `sap.m.App` root) to the host app. The
control forwards it once abap2UI5 has it.

## License

MIT

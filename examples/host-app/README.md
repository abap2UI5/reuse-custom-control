# Example: abap2UI5 inside a UI5 app

A plain UI5 app that embeds abap2UI5 apps with
[`@abap2ui5/reuse-custom-control`](../../packages/reuse-custom-control).
How to run it is in the [repository README](../../README.md#run-the-example).

What to look at:

| File | |
|---|---|
| `package.json` | the package is an ordinary dependency - nothing else wires it in |
| `webapp/view/Main.view.xml` | `xmlns:z2ui5="z2ui5.reuse"` and three `z2ui5:Container` controls |
| `webapp/controller/Main.controller.js` | starting another app = setting a model property |
| `webapp/manifest.json` | the `z2ui5` resourceRoot the Fiori launchpad needs |
| `ui5.yaml` | the proxy to the backend, and every UI5 library the ABAP apps use |
| `lib/sameOrigin.js` | why a dev proxy has to drop `Origin` for abap2UI5 |

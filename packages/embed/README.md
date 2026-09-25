# @abap2ui5/embed

Run [abap2UI5](https://github.com/abap2UI5/abap2UI5) apps inside any UI5 app.

abap2UI5 builds UI5 apps purely in ABAP: an ABAP class implementing
`z2ui5_if_app` decides the view and handles every event. This package puts
such an app into **your** UI5 app as an ordinary control, next to your own
controls:

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:z2ui5="z2ui5.reuse">
  <z2ui5:Container app="Z2UI5_CL_UI5_APP_HI_WORLD" height="400px"/>
</mvc:View>
```

## Install

```bash
npm install @abap2ui5/embed
```

It brings [`@abap2ui5/frontend`](https://www.npmjs.com/package/@abap2ui5/frontend)
along - the abap2UI5 frontend the control wraps, at the version it was tested
with. That is all the UI5 CLI needs: both packages are UI5 projects of type `module`
(the approach of [distribute and reuse UI5 custom controls via npm](https://community.sap.com/t5/technology-blog-posts-by-members/distribute-and-reuse-ui5-custom-controls-via-npm/ba-p/13472814)),
so `ui5 serve` serves them under `resources/z2ui5/` and `ui5 build --all`
copies them into `dist/resources/`. No `resourceroots` entry in a standalone
`index.html`, no `ui5.dependencies` in `package.json` (UI5 CLI 3 and later
pick up every dependency that has a `ui5.yaml`).

## Use

In an XML view, as above, or in code:

```js
sap.ui.require(["z2ui5/reuse/Container"], (Container) => {
  new Container({
    app: "ZCL_MY_ABAP2UI5_APP",
    params: { customer: "4711" },
    height: "600px",
  }).placeAt("content");
});
```

| Property | Type | Default | |
|---|---|---|---|
| `app` | string | | The ABAP class to run. Nothing starts while it is empty |
| `endpoint` | string | `/sap/bc/z2ui5` | URL of the abap2UI5 HTTP service - see [Backend](#backend) |
| `params` | object | | `{ name: "value" }`, read by the app with `client->get( )-t_comp_params` |
| `width` | CSSSize | `100%` | |
| `height` | CSSSize | `100%` | The app fills its container - give it a height, or a parent that has one |

| Event | Parameters | |
|---|---|---|
| `componentCreated` | `component` | The app's component exists (the first roundtrip is under way) |
| `componentFailed` | `reason` | It could not be created |

Every control is its **own abap2UI5 session** - two controls with the same
class do not share state. Changing `app`, `endpoint` or `params` ends the
running session and starts a new one; destroying the control ends it too.
All three are ordinary properties, so they can be bound to your model.

### Without the control

The control is a convenience. Underneath it is a UI5 reuse component, and
the package serves that too, so a `ComponentContainer` of your own works the
same way:

```js
new ComponentContainer({
  name: "z2ui5",
  async: true,
  manifest: true,
  settings: {
    componentData: {
      endpoint: "/sap/bc/z2ui5", // optional, this is the default
      startupParameters: { app_start: ["ZCL_MY_ABAP2UI5_APP"] },
    },
  },
});
```

## Backend

The control is the frontend only. The app runs on an ABAP system with
[abap2UI5 installed](https://abap2ui5.github.io/docs/configuration/installation.html)
and its HTTP service (by default `/sap/bc/z2ui5`) active.

**The page and the service have to share an origin.** abap2UI5 rejects a
POST whose `Origin` names another host than its own (its CSRF defense), so
the browser must reach the service through your app's origin:

- **deployed** - the app is served from the same system (BSP, launchpad), or
  an approuter / destination routes `/sap/bc/z2ui5` to it
- **`ui5 serve`** - a proxy middleware forwards `/sap` to the system. The
  proxy rewrites `Host` but passes the browser's `Origin` on, so it also has
  to drop `Origin` and `Referer`; the
  [example app](https://github.com/abap2UI5/embed/tree/main/examples/host-app)
  shows both pieces

The frontend in this package and the abap2UI5 on the system talk over a
versioned wire protocol. When the two do not fit, the embedded app says so
instead of rendering nothing - update the one that is behind.

## UI5 libraries

The embedded app loads whatever UI5 library its ABAP view names. With the UI5
CLI serving the framework (`framework:` in `ui5.yaml`), list every library
your ABAP apps use there, not only the ones your own views use - the hello
world app, for instance, needs `sap.ui.layout`.

## SAP Fiori launchpad

Inside the launchpad the app's own `resources/` folder is not a resource
root, so declare the namespace in your app's `manifest.json`:

```json
"sap.ui5": {
  "resourceRoots": { "z2ui5": "./resources/z2ui5/" }
}
```

## Supported UI5 versions

The same floor as abap2UI5: OpenUI5 / SAPUI5 **1.71** and later. The example
app is tested on 1.71 and 1.136. UI5 2.x is what abap2UI5 itself supports, but
has not been tested with this control yet.

## Known limitations

abap2UI5 was built to own the whole page. Until its embedded mode exists
([backlog item](https://github.com/abap2UI5/abap2UI5/blob/main/backlog/items/embed-as-reuse-component.md)),
an embedded app still

- shows the global busy indicator during a roundtrip, over the whole page
- may set the document title and favicon, when the ABAP app asks for it
- takes part in hash routing, when the ABAP app opts into it
- renders its root as `sap.m.App` and sends its messages to the page-wide
  message model

## What is inside

| Path | |
|---|---|
| `src/` | The control, `z2ui5/reuse/Container.js` and its stylesheet |
| `ui5.yaml` | The UI5 tooling project: `/resources/z2ui5/reuse/` is `src/` |
| dependency `@abap2ui5/frontend` | The abap2UI5 frontend (the `z2ui5` UI5 component): [abap2UI5 `app/webapp`](https://github.com/abap2UI5/abap2UI5/tree/main/app/webapp) of one release, unchanged, plus its `Component-preload.js` - pinned to the exact version this control is tested against |

## License

MIT

# abap2UI5 frontend-cc

abap2UI5 inside a UI5 app: the example app of
[abap2UI5/embed](https://github.com/abap2UI5/embed),
ready to install. A plain UI5 app places `z2ui5.reuse.Container` controls, and
each of them runs an abap2UI5 app - an ABAP class implementing `z2ui5_if_app` -
in its own backend session:

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:z2ui5="z2ui5.reuse">
  <z2ui5:Container app="Z2UI5_CL_UI5_APP_HI_WORLD" height="400px"/>
</mvc:View>
```

Every branch carries the whole thing - the app, the control and the abap2UI5
frontend it wraps - so nothing has to come from npm. It is the counterpart of
[abap2UI5/frontend](https://github.com/abap2UI5/frontend), which delivers the
abap2UI5 frontend on its own, and it is built the same way.

> ### This repository is generated — it does not take manual pull requests
>
> Every branch is built in
> [abap2UI5/embed](https://github.com/abap2UI5/embed)
> by `scripts/build-branches.mjs` and pushed in by its `frontend_cc_deploy`
> workflow — first as `result/<branch>` folders into one commit on `main`, then
> fanned out by the `deliver` workflow here, so each branch is exactly one
> commit ahead of `main`.
>
> ```
> abap2UI5/embed              abap2UI5/frontend-cc
>                      frontend_cc_deploy                       deliver
>   examples/host-app  ─────────────────▶  main           ──────────▶  standard
>                                           result/<branch>             standard_v2
>   + abap2UI5 at the commit of             (all four trees,            cloud
>     @abap2ui5/embed-control               one commit per              cloud_v2
>     (app/webapp with the control,         change)                     (each: main
>     tools/)                                                           + one commit)
> ```

#### Branch

| Name        | What                                          | System                                                | UI5 |
|-------------|-----------------------------------------------|-------------------------------------------------------|-----|
| standard    | BSP `Z2UI5_CC`, pulled with abapGit          | S/4 Private Cloud, S/4 On-Premise, R/3 NetWeaver >750 | classic, from the system |
| standard_v2 | BSP `Z2UI5_CC`, pulled with abapGit          | S/4 Private Cloud, S/4 On-Premise                     | legacy-free (UI5 2.x), from the CDN |
| cloud       | UI5 project in `app/`, deployed with the UI5 tooling | S/4 Public Cloud, BTP ABAP Environment         | classic, from the system |
| cloud_v2    | UI5 project in `app/`, deployed with the UI5 tooling | S/4 Public Cloud, BTP ABAP Environment         | legacy-free (UI5 2.x), from the CDN |

All four need [abap2UI5](https://github.com/abap2UI5/abap2UI5) installed in the
system - the embedded apps are its classes, `Z2UI5_CL_UI5_APP_HI_WORLD` in the
example.

**standard, standard_v2** - pull the branch with abapGit. It brings the BSP
`Z2UI5_CC` and its own HTTP service: the ICF node `/sap/bc/z2ui5_cc` with the
handler class `Z2UI5_CC_CL_LP_HANDLER`, which hands every request to
`z2ui5_cl_http_handler`. Nothing is shared with the `Z2UI5` BSP of
abap2UI5/frontend, so the two install side by side. Activate the ICF nodes
(`SICF`) and open `/sap/bc/ui5_ui5/sap/z2ui5_cc/index.html`.

**cloud, cloud_v2** - `app/` is a UI5 project. The embedded apps talk to the
HTTP service `Z2UI5` (`/sap/bc/http/sap/z2ui5`) that the `cloud` branch of
[abap2UI5/frontend](https://github.com/abap2UI5/frontend) installs - pull that
one first. Then:

```bash
cd app
npm install
npm start          # dev server, /sap/** proxied to http://localhost:3000
```

For a real system copy `.env.example` to `.env` and set its URL and user. To
deploy, add a deploy configuration for your system
(`npx @sap/ux-ui5-tooling fiori add deploy-config`) and deploy the app under a
name of your choice.

#### What is inside

```
index.html, Component.js, manifest.json, view/, controller/, css/
                   the example app (demo.host)
frontend/          the abap2UI5 frontend - the z2ui5 component
frontend/reuse/    the control, z2ui5.reuse.Container
frontend/preload.js
                   every module of the two above in one bundle; index.html
                   boots it, so the frontend starts after one request
```

The z2ui5 namespace is registered at `./frontend/` (index.html,
manifest.json). It cannot sit under `resources/` in a deployed app: the
`ui5_ui5` handler answers every `<app>/resources/` path from the UI5 library of
the system. In the BSP branches every file is a page of `Z2UI5_CC`
(`src/02`), `src/01` is the HTTP service.

The endpoint of the embedded apps is the data source in
`frontend/manifest.json` - `/sap/bc/z2ui5_cc` (standard) or
`/sap/bc/http/sap/z2ui5` (cloud). A single control can name another one with
its `endpoint` property.

#### Where to change what

| Content | Owned by |
|---|---|
| the app, the build | [abap2UI5/embed](https://github.com/abap2UI5/embed) — `examples/host-app`, `scripts/build-branches.mjs` |
| the control, the abap2UI5 frontend, the BSP tooling | [abap2UI5/abap2UI5](https://github.com/abap2UI5/abap2UI5) — `app/webapp` (the control in `app/webapp/reuse/`), `tools/`; reaches this repository with the next bump of `@abap2ui5/embed-control` in embed |
| `result/` on `main`, every branch | machine-written — a hand edit is overwritten by the next delivery |
| this repository's docs | here, as a maintenance pull request |

#### Issues

For bug reports or feature requests, open an issue in
[abap2UI5/embed](https://github.com/abap2UI5/embed/issues)
(the app, the control) or
[abap2UI5/abap2UI5](https://github.com/abap2UI5/abap2UI5/issues) (the
frontend, the backend).

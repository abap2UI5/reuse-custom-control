// z2ui5.reuse.Container - runs an abap2UI5 app inside any UI5 app.
//
//   <mvc:View xmlns:z2ui5="z2ui5.reuse">
//     <z2ui5:Container app="Z2UI5_CL_UI5_APP_HI_WORLD" height="400px"/>
//   </mvc:View>
//
// A thin wrapper around a sap.ui.core.ComponentContainer that holds the
// abap2UI5 frontend: the z2ui5 UIComponent this package ships under
// /resources/z2ui5/ (app/webapp of abap2UI5, see scripts/sync-frontend.mjs).
// Everything the app shows and does - views, popups, events, navigation - is
// decided by the ABAP class on the backend. This control only decides WHICH
// class runs, against WHICH endpoint, and how much room it gets.
//
// Every instance is its own abap2UI5 session, a stateful roundtrip chain on
// the backend. So changing app, endpoint or params starts a NEW component
// rather than patching the running one, and destroying the control destroys
// the component, which ends the backend session (z2ui5.Component#exit).
sap.ui.define(
  [
    "sap/ui/core/Control",
    "sap/ui/core/ComponentContainer",
    "sap/base/util/LoaderExtensions",
    "sap/base/Log",
    "sap/ui/dom/includeStylesheet",
  ],
  (Control, ComponentContainer, LoaderExtensions, Log, includeStylesheet) => {
    "use strict";

    // the component name - "sap.app/id" of abap2UI5's app/webapp/manifest.json
    const COMPONENT = "z2ui5";

    // Once per page. A stylesheet rather than inline styles, so a host with
    // a strict Content-Security-Policy (no 'unsafe-inline') needs nothing
    // extra for it.
    includeStylesheet(
      sap.ui.require.toUrl("z2ui5/reuse/Container.css"),
      "z2ui5-reuse-container-css",
    );

    return Control.extend("z2ui5.reuse.Container", {
      metadata: {
        properties: {
          // The ABAP class to run - it implements z2ui5_if_app, e.g.
          // Z2UI5_CL_UI5_APP_HI_WORLD, which every abap2UI5 installation
          // has. Nothing starts while it is empty.
          app: { type: "string", defaultValue: "" },

          // URL of the abap2UI5 HTTP service. Empty means the component's
          // own default, /sap/bc/z2ui5. The backend rejects a POST whose
          // Origin is not its own host, so this has to be reachable from the
          // page's origin - a relative path behind the app's proxy, the
          // approuter or the launchpad, not another server's URL.
          endpoint: { type: "string", defaultValue: "" },

          // Startup parameters for the app, { name: "value", ... }. The app
          // reads them with client->get( )-t_comp_params.
          params: { type: "object", defaultValue: null },

          width: { type: "sap.ui.core.CSSSize", defaultValue: "100%" },

          // The embedded app fills its container, so the height has to come
          // from somewhere: set it here, or place the control in a parent
          // with a height of its own.
          height: { type: "sap.ui.core.CSSSize", defaultValue: "100%" },
        },
        aggregations: {
          _container: {
            type: "sap.ui.core.ComponentContainer",
            multiple: false,
            visibility: "hidden",
          },
        },
        events: {
          // the z2ui5 component of the current app has been created
          componentCreated: {
            parameters: { component: { type: "sap.ui.core.UIComponent" } },
          },
          // it could not be created - the frontend files are not served, or
          // the manifest could not be loaded
          componentFailed: {
            parameters: { reason: { type: "object" } },
          },
        },
      },

      renderer: {
        apiVersion: 2,
        render(rm, control) {
          rm.openStart("div", control);
          rm.class("z2ui5ReuseContainer");
          rm.style("width", control.getWidth());
          rm.style("height", control.getHeight());
          rm.openEnd();
          const container = control.getAggregation("_container");
          if (container) rm.renderControl(container);
          rm.close("div");
        },
      },

      init() {
        // Bumped whenever the running app has to be replaced. A component
        // that is still being prepared for an older generation is dropped
        // when it arrives instead of being shown.
        this._generation = 0;
        this._preparing = -1;
      },

      exit() {
        // drops a component still being prepared; the one in _container
        // goes with the aggregation
        this._generation++;
      },

      setApp(value) {
        return this._setStartProperty("app", value);
      },

      setEndpoint(value) {
        return this._setStartProperty("endpoint", value);
      },

      setParams(value) {
        return this._setStartProperty("params", value);
      },

      // The three properties the backend session is started with. A change
      // throws the running component away (which ends its session) and lets
      // the next rendering start a fresh one.
      _setStartProperty(name, value) {
        const before = this.getProperty(name);
        this.setProperty(name, value);
        if (this.getProperty(name) !== before) {
          this._generation++;
          this.destroyAggregation("_container");
        }
        return this;
      },

      onBeforeRendering() {
        if (
          !this.getApp() ||
          this.getAggregation("_container") ||
          this._preparing === this._generation
        ) {
          return;
        }
        const generation = this._generation;
        this._preparing = generation;

        this._manifest()
          .then((manifest) => {
            // superseded by a newer start, or the control is gone (exit( )
            // bumps the generation too)
            if (generation !== this._generation) return;
            this.setAggregation(
              "_container",
              this._createContainer(manifest, generation),
            );
          })
          .catch((reason) => {
            if (generation !== this._generation) return;
            Log.error(
              "z2ui5.reuse.Container: loading the z2ui5 manifest failed",
              reason,
            );
            this.fireComponentFailed({ reason });
          });
      },

      // The manifest the component is created with. abap2UI5 reads its
      // backend URL from sap.app/dataSources/http/uri (App.controller in
      // app/webapp) and takes it from nowhere else, so for an endpoint of its
      // own this instance gets a COPY of the manifest with that uri replaced.
      // Without one the component loads its own manifest (true).
      _manifest() {
        const endpoint = this.getEndpoint();
        if (!endpoint) return Promise.resolve(true);
        return LoaderExtensions.loadResource(`${COMPONENT}/manifest.json`, {
          async: true,
          dataType: "json",
        }).then((manifest) => {
          // the loader may hand out a cached object - never write into it
          const copy = JSON.parse(JSON.stringify(manifest));
          copy["sap.app"].dataSources.http.uri = endpoint;
          return copy;
        });
      },

      _createContainer(manifest, generation) {
        return new ComponentContainer({
          name: COMPONENT,
          manifest,
          async: true,
          // the component lives and dies with this container - and so does
          // its backend session
          lifecycle: "Container",
          // the models of the host app stay out of the embedded app, which
          // brings its own
          propagateModel: false,
          // the same as the standalone abap2UI5 page (data-handle-validation)
          handleValidation: true,
          width: "100%",
          height: "100%",
          settings: { componentData: this._componentData() },
          componentCreated: (event) => {
            if (generation !== this._generation) return;
            this.fireComponentCreated({
              component: event.getParameter("component"),
            });
          },
          componentFailed: (event) => {
            if (generation !== this._generation) return;
            this.fireComponentFailed({ reason: event.getParameter("reason") });
          },
        });
      },

      // What the backend reads from the component data: app_start picks the
      // class (z2ui5_cl_ui5_handler=>request_app_start), and every parameter
      // reaches the app as client->get( )-t_comp_params. Both follow the
      // launchpad's shape - one array of values per parameter name.
      _componentData() {
        const startupParameters = {};
        for (const [name, value] of Object.entries(this.getParams() || {})) {
          startupParameters[name] = [String(value)];
        }
        startupParameters.app_start = [this.getApp()];
        return { startupParameters };
      },
    });
  },
);

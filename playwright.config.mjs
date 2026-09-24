import { defineConfig } from "@playwright/test";

// The example app, driven in a browser against a live abap2UI5 backend - on
// the UI5 release the example targets and on 1.71, the oldest one abap2UI5
// (and so the control) supports.
//
// The UI5 dev servers are started here. The backend is NOT: it has to be
// running already where the example's proxy points - http://localhost:3000
// by default, the transpiled abap2UI5 from an abap2UI5 checkout
// (`npm run express` there, see README), or any system set in
// examples/host-app/.env.
//
// PW_CHROMIUM_PATH runs a Chromium that is already installed instead of the
// one `npx playwright install chromium` downloads.
const serve = (config, port) => ({
  command: `npm run serve --workspace examples/host-app -- --config ${config} --port ${port}`,
  url: `http://localhost:${port}/index.html`,
  reuseExistingServer: !process.env.CI,
  // the first start downloads the OpenUI5 libraries
  timeout: 180_000,
});

export default defineConfig({
  testDir: "test/e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    viewport: { width: 1280, height: 1100 },
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [
    {
      name: "ui5-1.136",
      use: { baseURL: "http://localhost:8080" },
    },
    {
      name: "ui5-1.71",
      use: { baseURL: "http://localhost:8081" },
      metadata: { query: "?sap-ui-theme=sap_fiori_3" },
    },
  ],
  webServer: [serve("ui5.yaml", 8080), serve("ui5-1.71.yaml", 8081)],
});

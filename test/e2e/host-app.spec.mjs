import { test, expect } from "@playwright/test";

// The example host app (examples/host-app) with three z2ui5.reuse.Container
// controls - one bound to the host's model (#single), two side by side
// (#left, #right) - all running Z2UI5_CL_UI5_APP_HI_WORLD on the backend.
// Every test runs once per project in playwright.config.mjs (UI5 release).

const container = (page, id) =>
  page.locator(`.z2ui5ReuseContainer[id$='--${id}']`);
const postButtons = (page) => page.getByRole("button", { name: "Post" });

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(`/index.html${testInfo.project.metadata.query ?? ""}`);
  // every container has started its app once each shows the Post button
  await expect(postButtons(page)).toHaveCount(3, { timeout: 45_000 });
});

test("every container runs its own abap2UI5 session", async ({ page }) => {
  const left = container(page, "left");
  await left.getByRole("textbox").fill("Alice");
  await left.getByRole("button", { name: "Post" }).click();

  // the ABAP side answered with a message box built from the bound value
  await expect(page.getByText("Your name is Alice")).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  await expect(container(page, "right").getByRole("textbox")).toHaveValue("");
});

test("the host starts another app through its model", async ({ page }) => {
  await page.locator("[id$='--input-inner']").fill("z2ui5_cl_ui5_app_start");
  await page.locator("[id$='--start']").click();

  await expect(
    container(page, "single").getByText("Quickstart", { exact: false }),
  ).toBeVisible();
  // the two other containers are untouched
  await expect(postButtons(page)).toHaveCount(2);
});

test("the embedded app stays inside its container", async ({ page }) => {
  // sap.m.Shell centers itself on the viewport - Container.css keeps it in
  // the control's area, which is narrower than the viewport here
  for (const id of ["single", "left", "right"]) {
    const outer = await container(page, id).boundingBox();
    const inner = await container(page, id)
      .locator(".sapMShellCentralBox")
      .boundingBox();
    expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1);
    expect(inner.x + inner.width).toBeLessThanOrEqual(
      outer.x + outer.width + 1,
    );
  }
});

test("endpoint and params reach the backend", async ({ page }) => {
  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/sap/bc/z2ui5_alt"),
  );
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        sap.ui.require(
          ["z2ui5/reuse/Container"],
          (Container) => {
            const host = document.createElement("div");
            document.body.prepend(host);
            new Container({
              app: "Z2UI5_CL_UI5_APP_HI_WORLD",
              endpoint: "/sap/bc/z2ui5_alt",
              params: { customer: "4711" },
              height: "300px",
              componentCreated: () => resolve(),
            }).placeAt(host);
          },
          reject,
        );
      }),
  );

  const body = JSON.parse((await request).postData());
  expect(body.value.S_FRONT.CONFIG.ComponentData).toEqual({
    startupParameters: {
      customer: ["4711"],
      app_start: ["Z2UI5_CL_UI5_APP_HI_WORLD"],
    },
  });
  await expect(postButtons(page)).toHaveCount(4);
});

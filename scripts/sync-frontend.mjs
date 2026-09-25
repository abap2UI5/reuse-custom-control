// Brings the abap2UI5 frontend into the npm package.
//
// What the package ships under /resources/z2ui5/ is app/webapp of
// abap2UI5/abap2UI5 at the commit in A2UI5_PIN - the z2ui5 UIComponent the
// custom control wraps. It is NOT written here: app/webapp in abap2UI5 is its
// single source, so packages/reuse-custom-control/frontend/ is generated,
// git-ignored and replaced on every sync. A frontend change belongs in
// abap2UI5, followed by a bump of A2UI5_PIN here.
//
// Steps:
//   1. take app/webapp - from a local checkout when ABAP2UI5_DIR names one
//      (to try a frontend change before it is merged), otherwise a shallow,
//      sparse fetch of the pinned commit from GitHub
//   2. copy it into frontend/, without index.html (the shell page of the
//      standalone app - a host app brings its own)
//   3. build frontend/Component-preload.js with the UI5 CLI, so a host loads
//      the component in one request instead of one per module
//   4. stamp frontend/.a2ui5-pin, which lets the next run skip all of it
//
// Usage: node scripts/sync-frontend.mjs [--force]

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  abap2ui5,
  localDir as abap2ui5Dir,
  readPin,
  root,
} from "./abap2ui5.mjs";

const target = join(root, "packages", "reuse-custom-control", "frontend");
const stampFile = join(target, ".a2ui5-pin");
const EXCLUDE = new Set(["index.html"]);

const pin = readPin();
const localDir = abap2ui5Dir();
// a local checkout is stamped by its path, never by the pin - its content is
// whatever is checked out there, so it must not pass for the pinned commit
const wanted = localDir ? `local:${localDir}` : pin;

if (
  !process.argv.includes("--force") &&
  !localDir &&
  existsSync(stampFile) &&
  readFileSync(stampFile, "utf8").trim() === wanted
) {
  console.log(`sync: frontend is up to date (abap2UI5@${pin.slice(0, 8)})`);
  process.exit(0);
}

const work = mkdtempSync(join(tmpdir(), "a2ui5-sync-"));
try {
  const webapp = join(abap2ui5(["app/webapp"], work, "sync"), "app", "webapp");
  if (!existsSync(join(webapp, "Component.js"))) {
    throw new Error(`sync: no Component.js in ${webapp}`);
  }

  rmSync(target, { recursive: true, force: true });
  cpSync(webapp, target, {
    recursive: true,
    filter: (src) => !EXCLUDE.has(relative(webapp, src)),
  });
  buildPreload(target, work);
  writeFileSync(stampFile, `${wanted}\n`);

  console.log(`sync: frontend written to ${relative(root, target)}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

// A throwaway application project around a copy of the frontend: `ui5 build`
// writes Component-preload.js (plus its source map) for the z2ui5 component,
// and only those two files are taken back. The modules themselves stay the
// unminified sources, so a host debugging with sap-ui-debug=true reads them
// as they are in abap2UI5.
function buildPreload(frontend, dir) {
  const project = join(dir, "preload");
  cpSync(frontend, join(project, "webapp"), { recursive: true });
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({ name: "z2ui5-preload", version: "0.0.0", private: true }),
  );
  writeFileSync(
    join(project, "ui5.yaml"),
    [
      'specVersion: "4.0"',
      "metadata:",
      "  name: z2ui5-preload",
      "type: application",
      "",
    ].join("\n"),
  );

  const ui5 = createRequire(import.meta.url).resolve("@ui5/cli/bin/ui5.cjs");
  const dist = join(project, "dist");
  console.log("sync: building Component-preload.js");
  execFileSync(
    process.execPath,
    [ui5, "build", "--dest", dist, "--loglevel", "warn"],
    { cwd: project, stdio: "inherit" },
  );

  if (!existsSync(join(dist, "Component-preload.js"))) {
    throw new Error("sync: ui5 build wrote no Component-preload.js");
  }
  cpSync(
    join(dist, "Component-preload.js"),
    join(frontend, "Component-preload.js"),
  );

  // The build's map points every module at its -dbg copy, which only
  // exists in the build output. The package ships the unminified sources
  // under their own names, so the map is pointed at those instead.
  const mapFile = join(dist, "Component-preload.js.map");
  if (existsSync(mapFile)) {
    const map = JSON.parse(readFileSync(mapFile, "utf8"));
    for (const section of map.sections || [{ map }]) {
      // Foo-dbg.js -> Foo.js, App-dbg.controller.js -> App.controller.js
      section.map.sources = section.map.sources.map((s) =>
        s.replace(/-dbg\.(?=[^/]*$)/, "."),
      );
    }
    writeFileSync(
      join(frontend, "Component-preload.js.map"),
      JSON.stringify(map),
    );
  }
}

// Builds the four branches of abap2UI5/frontend-cc: the example host app
// (examples/host-app) with the reuse custom control and the abap2UI5 frontend
// inside it, delivered the way abap2UI5/frontend delivers the frontend alone.
//
//   standard     BSP Z2UI5_CC, classic UI5 bootstrap         (on premise)
//   standard_v2  BSP Z2UI5_CC, legacy-free UI5 (2.x) from the CDN
//   cloud        the same app as a UI5 project to deploy     (ABAP Cloud)
//   cloud_v2     like cloud, legacy-free bootstrap
//
// Usage: node scripts/build-branches.mjs [branch ...]
// Without arguments all four are built, into the git-ignored out/<branch>/.
// Nothing is stamped here - scripts/branch-stamp.mjs names the commit at
// deploy time, so the same sources always build the same bytes.
//
// What goes into every tree is one webapp:
//
//   index.html, Component.js, manifest.json, view/, controller/, css/
//                  examples/host-app/webapp - the example, unchanged but for
//                  the patches below
//   frontend/      abap2UI5 app/webapp at A2UI5_PIN (without its index.html)
//                  - the z2ui5 component the control wraps
//   frontend/reuse/
//                  packages/embed/src - the control
//   frontend/preload.js
//                  all modules of the two above in one bundle
//
// That is the layout the npm package is served in (/resources/z2ui5/ =
// frontend, /resources/z2ui5/reuse/ = the control), one folder down: z2ui5
// cannot live under resources/ inside a deployed app, because the ui5_ui5
// handler answers every <app>/resources/ path from the UI5 library of the
// system. So the host registers the z2ui5 namespace at ./frontend/ instead.
//
// The BSP variants go through abap2UI5's own tools, taken at the pin like the
// frontend itself: app2bsp/preload.js (the bundle, in lines a BSP page can
// carry), app2bsp/run.js (webapp -> BSP pages), bsp_rename (the deployment
// identity, see NAME) and check-pages.mjs (the page invariants). What differs
// from abap2UI5/frontend is the webapp they are handed, nothing else - a BSP
// that is right there is right here.
//
// The endpoint of the embedded apps is the z2ui5 manifest's data source:
//   standard*  /sap/bc/z2ui5_cc        the node this branch ships (src/01)
//   cloud*     /sap/bc/http/sap/z2ui5  the HTTP service Z2UI5 of
//                                      abap2UI5/frontend's cloud branch

import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { abap2ui5, root } from "./abap2ui5.mjs";
import { banner } from "./branch-stamp.mjs";

// The deployment identity of the BSP variants: BSP Z2UI5_CC, SICF nodes
// /sap/bc/z2ui5_cc, /sap/bc/bsp/sap/z2ui5_cc, /sap/bc/ui5_ui5/sap/z2ui5_cc,
// handler class Z2UI5_CC_CL_LP_HANDLER. Its own, so it installs next to the
// Z2UI5 of abap2UI5/frontend without touching it.
export const NAME = "z2ui5_cc";

export const BRANCHES = ["cloud", "cloud_v2", "standard", "standard_v2"];

const out = join(root, "out");
const hostApp = join(root, "examples", "host-app");
const control = join(root, "packages", "embed", "src");
const delivery = join(root, "delivery");

// the frontend's backend path, and what the cloud branches point it at -
// the path of the HTTP service Z2UI5 in ABAP Cloud (abap2UI5/frontend's
// build-branches.mjs does the same for its cloud branches)
const ONPREM_URI = "/sap/bc/z2ui5";
const CLOUD_URI = "/sap/bc/http/sap/z2ui5";

const ABAPGIT_XML = `\uFEFF<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
 <asx:values>
  <DATA>
   <NAME>abap2UI5-frontend-cc</NAME>
   <MASTER_LANGUAGE>E</MASTER_LANGUAGE>
   <STARTING_FOLDER>/src/</STARTING_FOLDER>
   <FOLDER_LOGIC>PREFIX</FOLDER_LOGIC>
  </DATA>
 </asx:values>
</asx:abap>
`;

// Every patch below is an assumption about a file this repository or abap2UI5
// writes. If one stops holding, carrying on would deliver a branch that is
// consistent with its sources and still wrong - so it fails the build.
function mustReplace(text, from, to, what) {
  const found =
    typeof from === "string" ? text.includes(from) : from.test(text);
  if (!found) throw new Error(`build-branches: ${what} not found`);
  return text.replace(from, to);
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

// Quiet on success, never on failure: the discarded log is the only thing
// that says WHY a step failed.
function run(args, cwd) {
  try {
    execFileSync(process.execPath, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    process.stderr.write(String(error.stdout ?? ""));
    process.stderr.write(String(error.stderr ?? ""));
    throw error;
  }
}

// ---------------------------------------------------------------------------
// the webapp every branch is made of
// ---------------------------------------------------------------------------

// The z2ui5 component with the control in it - app/webapp at the pin, its
// index.html included (preload.js patches it; it is dropped afterwards).
function frontendWebapp(a2, dir) {
  cpSync(join(a2, "app", "webapp"), dir, { recursive: true });
  cpSync(control, join(dir, "reuse"), { recursive: true });
}

// frontend/preload.js: abap2UI5's app2bsp/preload.js run on the frontend
// with the control in it - every z2ui5/** module, the control's included, as
// one minified bundle in lines a BSP page can carry, ending in a require of
// sap/ui/core/ComponentSupport. The host page boots it (see hostIndexHtml),
// so the component starts after one request instead of ~50. The bundle is
// the same for all four branches: it leaves index.html and manifest.json out,
// the only files the variants differ in.
function buildPreload(a2, work) {
  const dir = join(work, "preload");
  cpSync(join(a2, "tools", "app2bsp"), join(dir, ".github", "app2bsp"), {
    recursive: true,
  });
  frontendWebapp(a2, join(dir, "frontend", "app", "webapp"));
  run([join(".github", "app2bsp", "preload.js")], dir);
  return readFileSync(
    join(dir, "frontend", "app", "webapp", "preload.js"),
    "utf8",
  );
}

// The host page. The example boots through ComponentSupport and leaves the
// z2ui5 namespace to the UI5 CLI, which serves the npm package; here the
// namespace is ./frontend/, and the page boots through the bundle - which
// needs the namespace registered before the core loads it.
function hostIndexHtml(html) {
  html = mustReplace(
    html,
    /<!-- No resourceroots entry for z2ui5:[\s\S]*?-->/,
    "<!-- z2ui5 is the abap2UI5 frontend with the reuse control, delivered\n" +
      "         next to this page in frontend/. The page boots through its\n" +
      "         bundle, frontend/preload.js, which registers every z2ui5\n" +
      "         module and then starts the component below. -->",
    "the resourceroots comment of examples/host-app/webapp/index.html",
  );
  html = mustReplace(
    html,
    /("demo\.host": "\.\/")\n(\s*)\}/,
    '$1,\n$2    "z2ui5": "./frontend/"\n$2}',
    'the "demo.host" resourceroots entry',
  );
  return mustReplace(
    html,
    'data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"',
    'data-sap-ui-oninit="module:z2ui5/preload"',
    "the ComponentSupport oninit module",
  );
}

// The legacy-free bootstrap - the same switch abap2UI5's
// app2app_v2/patch-v2.mjs makes on the frontend page, with its SDK, on the
// host page (whose title and attributes that patch does not know).
function hostIndexHtmlV2(html, sdk) {
  html = mustReplace(
    html,
    /(<title>[^<]*<\/title>\n)/,
    '$1    <link rel="preconnect" href="https://sdk.openui5.org" crossorigin>\n' +
      '    <link rel="dns-prefetch" href="https://sdk.openui5.org">\n',
    "the <title> line",
  );
  html = mustReplace(
    html,
    'src="resources/sap-ui-core.js"',
    `src="${sdk}"`,
    'the src="resources/sap-ui-core.js" bootstrap',
  );
  html = mustReplace(
    html,
    "data-sap-ui-resourceroots=",
    "data-sap-ui-resource-roots=",
    "data-sap-ui-resourceroots",
  );
  html = mustReplace(
    html,
    "data-sap-ui-oninit=",
    "data-sap-ui-on-init=",
    "data-sap-ui-oninit",
  );
  return mustReplace(
    html,
    /data-sap-ui-compatVersion=("[^"]*")/,
    'data-sap-ui-compat-version=$1\n        data-sap-ui-libs="sap.m"',
    "data-sap-ui-compatVersion",
  );
}

// The webapp of one branch, in `dir`.
function assembleWebapp({ a2, dir, preload, v2, cloud }) {
  cpSync(join(hostApp, "webapp"), dir, { recursive: true });
  const fe = join(dir, "frontend");
  frontendWebapp(a2, fe);
  rmSync(join(fe, "index.html"));
  writeFileSync(join(fe, "preload.js"), preload);

  const { patchManifest, SDK } = v2;
  const index = join(dir, "index.html");
  let html = hostIndexHtml(readFileSync(index, "utf8"));
  if (SDK) html = hostIndexHtmlV2(html, SDK);
  writeFileSync(index, html);

  // the host registers the namespace where it is delivered
  const hostManifest = readJson(join(dir, "manifest.json"));
  const roots = hostManifest["sap.ui5"]?.resourceRoots;
  if (roots?.z2ui5 !== "./resources/z2ui5/") {
    throw new Error(
      `build-branches: examples/host-app manifest.json resourceRoots.z2ui5 is ` +
        `${JSON.stringify(roots?.z2ui5)}, expected "./resources/z2ui5/"`,
    );
  }
  roots.z2ui5 = "./frontend/";
  writeJson(join(dir, "manifest.json"), hostManifest);

  const feManifest = readJson(join(fe, "manifest.json"));
  const http = feManifest["sap.app"]?.dataSources?.http;
  if (http?.uri !== ONPREM_URI) {
    throw new Error(
      `build-branches: abap2UI5 manifest.json sap.app.dataSources.http.uri is ` +
        `${JSON.stringify(http?.uri)}, expected "${ONPREM_URI}"`,
    );
  }
  // the standard branches keep /sap/bc/z2ui5 here - bsp_rename repoints it
  // at the renamed node along with the rest of the identity
  if (cloud) http.uri = CLOUD_URI;
  writeJson(join(fe, "manifest.json"), feManifest);

  if (patchManifest) {
    for (const file of [
      join(dir, "manifest.json"),
      join(fe, "manifest.json"),
    ]) {
      writeFileSync(file, patchManifest(readFileSync(file, "utf8")));
    }
  }
}

// ---------------------------------------------------------------------------
// the branches
// ---------------------------------------------------------------------------

function initBranch(branch) {
  const dir = join(out, branch);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(root, "LICENSE"), join(dir, "LICENSE"));
  writeFileSync(join(dir, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(dir, "README.md"),
    banner(branch) + "\n" + readFileSync(join(delivery, "README.md"), "utf8"),
  );
  return dir;
}

// app/: the example's UI5 project around the webapp, the control and the
// frontend vendored into it instead of coming from npm.
function buildCloud(ctx, branch) {
  const dir = initBranch(branch);
  const app = join(dir, "app");
  for (const file of ["lib", ".env.example"]) {
    cpSync(join(hostApp, file), join(app, file), { recursive: true });
  }
  writeFileSync(join(app, ".gitignore"), "node_modules/\ndist/\n.env\n");

  const pkg = readJson(join(hostApp, "package.json"));
  if (!pkg.dependencies?.["@abap2ui5/embed"]) {
    throw new Error(
      "build-branches: examples/host-app/package.json no longer depends on " +
        "@abap2ui5/embed",
    );
  }
  delete pkg.dependencies;
  pkg.description =
    "abap2UI5 inside a UI5 app - the example of " +
    "@abap2ui5/embed, with the control and the abap2UI5 " +
    "frontend in webapp/frontend";
  writeJson(join(app, "package.json"), pkg);

  // The vendored frontend is not part of the host's own Component-preload:
  // it is z2ui5, not demo.host, and it brings its bundle along. The prefix
  // form, because the bundler reads "frontend/**" as its direct children
  // only; the manifest separately, because the bundler includes every
  // **/manifest.json of the namespace on its own.
  const yaml = mustReplace(
    readFileSync(join(hostApp, "ui5.yaml"), "utf8"),
    /\nserver:\n/,
    "\nbuilder:\n" +
      "  # frontend/ is the abap2UI5 frontend with the reuse control (the z2ui5\n" +
      "  # namespace) - it has its own bundle, frontend/preload.js\n" +
      "  componentPreload:\n" +
      "    excludes:\n" +
      '      - "demo/host/frontend/"\n' +
      '      - "demo/host/frontend/manifest.json"\n' +
      "server:\n",
    "the server: section of examples/host-app/ui5.yaml",
  );
  writeFileSync(join(app, "ui5.yaml"), yaml);

  assembleWebapp({
    ...ctx,
    dir: join(app, "webapp"),
    v2: branch === "cloud_v2" ? ctx.v2 : {},
    cloud: true,
  });
}

// src/: the ICF handler (01, abap2UI5 frontend/abap/standard) and the BSP
// (02, app2bsp/run.js), renamed to NAME by bsp_rename.
function buildStandard(ctx, branch) {
  const dir = initBranch(branch);
  writeFileSync(join(dir, ".abapgit.xml"), ABAPGIT_XML);

  // the abaplint config of abap2UI5/frontend's branches, glob turned to /src/
  const lint = readFileSync(
    join(ctx.a2, "frontend", "abap", "cloud", "abaplint.jsonc"),
    "utf8",
  );
  writeFileSync(
    join(dir, "abaplint.jsonc"),
    mustReplace(
      lint,
      '"files": "/**/*.*"',
      '"files": "/src/**/*.*"',
      "the files glob of frontend/abap/cloud/abaplint.jsonc",
    ),
  );

  const work = join(ctx.work, branch);
  cpSync(join(ctx.a2, "tools", "app2bsp"), join(work, ".github", "app2bsp"), {
    recursive: true,
  });
  assembleWebapp({
    ...ctx,
    dir: join(work, "frontend", "app", "webapp"),
    v2: branch === "standard_v2" ? ctx.v2 : {},
    cloud: false,
  });
  run([join(".github", "app2bsp", "run.js")], work);

  cpSync(join(ctx.a2, "frontend", "abap", "standard"), join(dir, "src"), {
    recursive: true,
  });
  cpSync(join(work, "src", "02"), join(dir, "src", "02"), { recursive: true });

  // The texts an installer sees next to the objects, before the rename (which
  // leaves them alone): they said "abap2UI5 frontend", and this is not it.
  const wapa = join(dir, "src", "02", "z2ui5.wapa.xml");
  writeFileSync(
    wapa,
    mustReplace(
      readFileSync(wapa, "utf8"),
      "<TEXT>abap2UI5 frontend (generated)</TEXT>",
      "<TEXT>abap2UI5 in a UI5 app, reuse control (generated)</TEXT>",
      "the BSP short text in z2ui5.wapa.xml",
    ),
  );
  const pkg = join(dir, "src", "package.devc.xml");
  writeFileSync(
    pkg,
    mustReplace(
      readFileSync(pkg, "utf8"),
      "<CTEXT>abap2UI5 - frontend</CTEXT>",
      "<CTEXT>abap2UI5 - frontend with reuse custom control</CTEXT>",
      "the package text in frontend/abap/standard/package.devc.xml",
    ),
  );

  run(
    [
      join(ctx.a2, "tools", "bsp_rename", "rename-bsp.mjs"),
      NAME,
      "--yes",
      "--dir",
      "src",
    ],
    dir,
  );
}

// ---------------------------------------------------------------------------

const requested = process.argv.slice(2);
const branches = requested.length ? requested : BRANCHES;
for (const b of branches) {
  if (!BRANCHES.includes(b)) {
    console.error(`Unknown branch '${b}' - allowed: ${BRANCHES.join(", ")}`);
    process.exit(1);
  }
}

const work = join(out, "_work");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
try {
  const a2 = abap2ui5(
    ["app/webapp", "tools", "frontend/abap"],
    work,
    "build-branches",
  );
  const { patchManifest, SDK } = await import(
    pathToFileURL(join(a2, "tools", "app2app_v2", "patch-v2.mjs")).href
  );
  const ctx = { a2, work, v2: { patchManifest, SDK } };
  console.log("build-branches: bundling frontend/preload.js");
  ctx.preload = buildPreload(a2, work);

  for (const b of branches) {
    if (b.startsWith("cloud")) buildCloud(ctx, b);
    else buildStandard(ctx, b);
  }

  // abap2UI5's page invariants, on the built BSPs: check-pages reads the
  // trees from the out/ next to itself
  const checker = join(work, "check", "tools");
  mkdirSync(checker, { recursive: true });
  cpSync(
    join(a2, "tools", "check-pages.mjs"),
    join(checker, "check-pages.mjs"),
  );
  for (const b of branches) {
    cpSync(join(out, b), join(checker, "out", b), { recursive: true });
  }
  execFileSync(
    process.execPath,
    [join(checker, "check-pages.mjs"), ...branches],
    { stdio: "inherit" },
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}

for (const b of branches) {
  const n = readdirSync(join(out, b), { recursive: true }).length;
  console.log(`OK: ${b} (${n} entries) -> ${relative(root, join(out, b))}`);
}

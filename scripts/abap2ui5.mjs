// Where the scripts get abap2UI5 from: the commit the installed
// @abap2ui5/frontend was built from, or a local checkout named by
// ABAP2UI5_DIR (to try a change before it is merged).
//
// ONE pin for everything: packages/embed/package.json names the exact
// @abap2ui5/frontend version the npm package depends on, and that package
// records its abap2UI5 commit under `abap2ui5.commit`. build-branches.mjs
// takes app/webapp plus the tools that turn a webapp into a BSP (tools/) and
// the ABAP artefacts around it (frontend/abap) from that commit, and the e2e
// job builds the backend from it - so the frontend-cc branches, the tests and
// the npm package cannot pair different frontends. There used to be a second
// pin, A2UI5_PIN, kept in step with the vendored copy by hand.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/abap2UI5/abap2UI5.git";

// The abap2UI5 commit of the installed @abap2ui5/frontend - resolved from
// the workspace, so `npm ci` has to have run.
export function readPin() {
  let manifest;
  try {
    manifest = createRequire(join(root, "package.json"))(
      "@abap2ui5/frontend/package.json",
    );
  } catch {
    throw new Error(
      "@abap2ui5/frontend is not installed - run npm ci first (its version in " +
        "packages/embed/package.json is the abap2UI5 release everything here builds from)",
    );
  }
  const pin = manifest.abap2ui5?.commit ?? "";
  if (!/^[0-9a-f]{40}$/.test(pin)) {
    throw new Error(
      `@abap2ui5/frontend@${manifest.version} records no abap2UI5 commit: '${pin}'`,
    );
  }
  return pin;
}

// The local checkout ABAP2UI5_DIR names, or null.
export function localDir() {
  return process.env.ABAP2UI5_DIR ? resolve(process.env.ABAP2UI5_DIR) : null;
}

export function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

// The abap2UI5 root to read `paths` from: the local checkout when
// ABAP2UI5_DIR is set (with a warning when it is not at the pin), otherwise a
// shallow, sparse fetch of the pinned commit into `work`.
export function abap2ui5(paths, work, label) {
  const pin = readPin();
  const dir = localDir();
  if (dir) {
    for (const path of paths) {
      if (!existsSync(join(dir, path))) {
        throw new Error(`ABAP2UI5_DIR: no ${path} below ${dir}`);
      }
    }
    let head = "unknown";
    try {
      head = git(["rev-parse", "HEAD"], dir);
    } catch {
      // not a git checkout - the warning below still applies
    }
    if (head !== pin) {
      console.warn(
        `${label}: WARNING - using ${dir} at ${head.slice(0, 8)}, ` +
          `@abap2ui5/frontend is built from ${pin.slice(0, 8)}. Do not deploy this build.`,
      );
    }
    return dir;
  }

  const clone = join(work, "abap2UI5");
  mkdirSync(clone, { recursive: true });
  git(["init", "--quiet"], clone);
  git(["remote", "add", "origin", REPO], clone);
  git(["sparse-checkout", "set", ...paths], clone);
  console.log(
    `${label}: fetching abap2UI5@${pin.slice(0, 8)} (${paths.join(", ")})`,
  );
  git(
    ["fetch", "--quiet", "--depth", "1", "--filter=blob:none", "origin", pin],
    clone,
  );
  git(["checkout", "--quiet", "FETCH_HEAD"], clone);
  return clone;
}

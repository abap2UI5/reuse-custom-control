// Where the scripts get abap2UI5 from: the commit in A2UI5_PIN, or a local
// checkout named by ABAP2UI5_DIR (to try a change before it is merged).
//
// Shared by sync-frontend.mjs, which takes app/webapp into the npm package,
// and build-branches.mjs, which takes app/webapp plus the tools that turn a
// webapp into a BSP (tools/) and the ABAP artefacts around it (frontend/abap)
// for the branches of abap2UI5/frontend-cc. Both have to agree on the commit,
// so both read it here.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/abap2UI5/abap2UI5.git";

export function readPin() {
  const pin = readFileSync(join(root, "A2UI5_PIN"), "utf8").trim();
  if (!/^[0-9a-f]{40}$/.test(pin)) {
    throw new Error(`A2UI5_PIN is not a full commit sha: '${pin}'`);
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
          `A2UI5_PIN is ${pin.slice(0, 8)}. Do not publish this build.`,
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

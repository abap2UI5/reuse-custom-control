// The provenance of an abap2UI5/frontend-cc branch: the commit of this
// repository it was built from and the abap2UI5 commit whose frontend it
// carries - in the first line of its README and in VERSION.
//
//   node scripts/branch-stamp.mjs <dir> <branch> <sha>
//
// A step of its own, run by the deploy right before the push, for the same
// reason as abap2UI5's tools/branch-stamp.mjs: build-branches.mjs builds the
// same bytes from the same sources - on a pull request too, where the commit
// the stamp would name does not exist yet - and the deploy answers "did the
// content change?" by stamping a copy with the commit the published VERSION
// names and comparing (.github/workflows/frontend_cc_deploy.yaml).

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPin } from "./abap2ui5.mjs";

const SELF = "abap2UI5/reuse-custom-control";

// First line of every branch README. build-branches.mjs writes it without
// the provenance, this script replaces it with the same line including it.
export const BANNER_PREFIX = "> ⚙️ **Generated branch";

export function banner(branch, { sha = null, pin = null } = {}) {
  const origin = sha
    ? ` State: \`${SELF}@${sha.slice(0, 12)}\` with the frontend of ` +
      `\`abap2UI5/abap2UI5@${pin.slice(0, 12)}\` — see \`VERSION\`.`
    : "";
  return (
    `${BANNER_PREFIX} \`${branch}\`** — built in ` +
    `[${SELF}](https://github.com/${SELF}) by its \`frontend_cc_deploy\` ` +
    "workflow and pushed here. Do not commit in this repository; changes " +
    `belong into ${SELF} (the app, the control) or abap2UI5/abap2UI5 (the ` +
    "frontend)." +
    origin +
    "\n"
  );
}

export function versionStamp({ sha, pin }) {
  return [
    "Generated abap2UI5 frontend-cc branch — provenance",
    `built from: ${SELF}@${sha}`,
    `abap2UI5 frontend: abap2UI5/abap2UI5@${pin}`,
    "",
  ].join("\n");
}

function stamp(dir, branch, sha) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
    throw new Error(`branch-stamp: '${sha}' is not a full commit sha`);
  }
  const pin = readPin();
  const readme = join(dir, "README.md");
  const text = readFileSync(readme, "utf8");
  if (!text.startsWith(BANNER_PREFIX)) {
    throw new Error(`branch-stamp: ${readme} does not start with the banner`);
  }
  writeFileSync(
    readme,
    banner(branch, { sha, pin }) + text.slice(text.indexOf("\n") + 1),
  );
  writeFileSync(join(dir, "VERSION"), versionStamp({ sha, pin }));
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const [dir, branch, sha] = process.argv.slice(2);
  if (!dir || !branch) {
    console.error("Usage: node scripts/branch-stamp.mjs <dir> <branch> <sha>");
    process.exit(1);
  }
  stamp(dir, branch, sha);
}

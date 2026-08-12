# Deployment Build Failure — External Advisor Diagnosis

**Project:** Name of the Words  
**Prepared:** 12 August 2026  
**Prepared by:** Manus AI  
**Purpose:** Provide an evidence-based handoff for diagnosing a deployment build that is still reported as failing after an initial pnpm build-script approval fix.

## Executive Summary

The recurring deployment failure is associated with pnpm’s dependency build-script approval mechanism. The original build logs terminated during `pnpm install` with `ERR_PNPM_IGNORED_BUILDS`, naming `better-sqlite3`, `bufferutil`, and several `esbuild` versions. A repository-level allowlist was then added in `pnpm-workspace.yaml`, and the project’s local `CI=true pnpm install --frozen-lockfile` completed successfully under the local pnpm 11.18.0 runtime.

However, the deployment logs identify **pnpm 10.33.0** in the build environment. The project does not declare a `packageManager` field in `package.json`, so the exact pnpm version and config-resolution path used in deployment are platform-controlled. A clean reproduction using pnpm 10.33.0 could not be completed in the sandbox because its package downloads failed before build-script evaluation; it therefore does **not** prove that the deployed pnpm 10 process accepts the present allowlist. The next most likely issue is a **pnpm-version/configuration compatibility or build-context issue**, not application code.

> **Correction of the previous conclusion:** It was incorrect to describe this as inherently platform-only before repository-level approval settings had been tried. Repository configuration is the appropriate first remedy. It has now been added and verified only under local pnpm 11.18.0; the continued reported failure means its effectiveness under the platform’s pnpm 10.33.0 build must be verified directly.

| Current conclusion | Confidence | Basis |
|---|---:|---|
| The original failure is triggered during dependency installation, before the application build or runtime starts. | High | Deployment log ends at `corepack pnpm install` with `ERR_PNPM_IGNORED_BUILDS`. |
| `better-sqlite3` and `esbuild` need permission to execute their installation scripts for this project. | High | They are named by pnpm; `esbuild` is needed by `vite build`, and the local approved install ran their scripts. |
| `bufferutil` is optional for the application’s ordinary build path. | Medium | It is listed under `optionalDependencies` and was deliberately denied in the allowlist. |
| The current repository configuration definitely reaches and is honored by the failing deployment. | Not yet established | No post-fix failing log with commit/version identity has been provided for this report. |
| The issue is exclusively platform-level. | Not established | The pnpm version mismatch and build-context/config compatibility remain untested. |

## System and Repository Facts

The deployed application is an Express/Vite project built with pnpm. The relevant production build command is:

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

The repository currently has no custom `Dockerfile`, no `.dockerignore`, no `packageManager` field, and no Node `engines` field. The lack of a project-pinned package-manager version matters because the deployment logs identify a specific platform pnpm version: **10.33.0**.

The repository currently contains this file:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  better-sqlite3: true
  esbuild: true
  bufferutil: false
```

pnpm’s official 10.x documentation confirms that pnpm obtains configuration from `pnpm-workspace.yaml` as well as command-line arguments, environment variables, and `.npmrc` files.[1] The same documentation identifies `allowBuilds` as an explicit build-script control in 10.x; the 10.x `approve-builds` command documentation also describes the compatible legacy approval representation, `onlyBuiltDependencies`, in `pnpm-workspace.yaml`.[2] The v10.33.0 CLI bundled in the repository’s installed dependencies contains references to both `allowBuilds` and `onlyBuiltDependencies`.

## Original Failure Evidence

Multiple deployment attempts produced two distinct failure families.

### A. Custom Dockerfile / global pnpm configuration failures

The first custom-Dockerfile variants attempted to set global pnpm configuration during the image build. They failed before dependency installation because pnpm’s global bin directory was not on `PATH`.

```text
[ERROR] The configured global bin directory "/pnpm/bin" is not in PATH
Run "pnpm setup" to update your shell configuration.
```

Another custom-Dockerfile form failed similarly with:

```text
[ERROR] The configured global bin directory "/root/.local/share/pnpm/bin" is not in PATH
```

These failures were caused by the Dockerfile approach, not by application source code. The custom Dockerfile was removed; the project reverted to the platform’s generated build path.

### B. Default deployment build: unapproved package build scripts

With the default build path, deployment reached dependency installation but then terminated with the relevant pnpm error:

```text
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts:
better-sqlite3@11.10.0, bufferutil@4.1.0,
esbuild@0.18.20, esbuild@0.21.5, esbuild@0.25.10, esbuild@0.27.7

Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

The failing platform invocation was:

```text
CI=true corepack pnpm install --prefer-offline --prod=false
```

and the log identified `pnpm 10.33.0` in the installed dependency list. The failure occurred at the install stage, before `pnpm run build` was executed.

## Changes Already Tried

| Attempt | Change | Result | Assessment |
|---|---|---|---|
| Custom Dockerfile, global store configuration | Called `pnpm config set ... -g`. | Failed because pnpm’s configured global bin path was absent from `PATH`. | Do not restore this variant. |
| Custom Dockerfile, simplified install | Used `corepack pnpm install` then `pnpm run build`. | Reached pnpm’s ignored-build protection and failed. | The Dockerfile did not solve approvals. |
| Custom Dockerfile with hoisting / auto peers | Added `--shamefully-hoist` and a global config command. | Failed at the global pnpm configuration step. | Not relevant to build approval. |
| Default generated Dockerfile | Removed custom Dockerfile. | Reproduced `ERR_PNPM_IGNORED_BUILDS` during dependency install. | Correctly isolated the real problem. |
| Repository approval via `pnpm approve-builds` | Added `pnpm-workspace.yaml` allowlist with `better-sqlite3` and `esbuild` true; `bufferutil` false. | Local pnpm 11.18.0 `CI=true pnpm install --frozen-lockfile` succeeded and ran both approved scripts. | Valid local evidence, but does not yet prove deployment pnpm 10.33.0 behavior. |
| Local production build | Ran `pnpm run build`. | Succeeded. | Application compilation is not the blocker. |
| Isolated pnpm 10.33.0 install attempt | Attempted a clean install under v10.33.0. | Failed early with registry/tarball availability errors in the sandbox before script processing. | Inconclusive for allowlist compatibility. |

## Verification Already Completed

The following checks completed successfully in the project environment:

| Command or check | Result | What it proves |
|---|---|---|
| `CI=true pnpm install --frozen-lockfile` with local pnpm 11.18.0 | Passed. `esbuild` postinstall scripts and `better-sqlite3` native install completed. | The current allowlist is effective under pnpm 11.18.0. |
| `pnpm run build` | Passed. Vite and esbuild emitted `dist/public/*` and `dist/index.js`. | The application builds when dependencies are installed. |
| `pnpm exec vitest run server/export.test.ts --reporter=dot` | Passed: 2 tests. | The latest export repair’s focused regression coverage passed. |
| Local JSON export endpoint | HTTP 200; required top-level keys and six Ideas Mode arrays present. | The export endpoint format is valid locally. |
| Published export endpoint prior to the latest local export fix | HTTP 200. | A production deployment and public domain were reachable at least once. |

The platform also reported at least one successful deployment and an active domain, `namewords-ogafsucx.manus.space`. This conflicts with the report that a later deployment remains unsuccessful. The advisor should therefore identify the **specific failed build ID, source commit, and release attempt** before treating all failures as the same event.

## Most Important Open Questions

### 1. Did the failing deployment build the commit that contains `pnpm-workspace.yaml`?

The allowlist was committed in the project history before the latest export-fix checkpoint. The current branch history includes the approval configuration commit and its checkpoint. The next failed-build log must be matched to its checked-out commit SHA or release/version identifier. If it built an earlier checkpoint, then the failure is expected and does not invalidate the fix.

### 2. Does the build context include `pnpm-workspace.yaml`?

There is no `.dockerignore` in the repository and no custom Dockerfile at present, so nothing in the repository is known to exclude the file. Nonetheless, the generated Docker build must be checked for an explicit `COPY` pattern, a source archive filter, or a platform-specific packaging rule that omits root workspace configuration.

### 3. Does pnpm 10.33.0 consume this `allowBuilds` syntax in the deployment mode?

This is the key configuration-compatibility question. The repository’s current YAML uses the `allowBuilds` map emitted by a newer local pnpm workflow. The official pnpm 10.x `approve-builds` documentation says approvals are stored as `onlyBuiltDependencies` in `pnpm-workspace.yaml`.[2] Although the v10.33.0 CLI source contains both configuration keys, a successful clean v10.33 install in an environment with registry access is still needed to show exactly which representation it reads during the platform’s install command.

### 4. Is the deployment install command overriding workspace behavior?

The logs show `CI=true corepack pnpm install --prefer-offline --prod=false`. The advisor should verify whether the generated build runs with `--ignore-workspace`, changes the working directory, injects an `.npmrc`, uses a different lockfile root, or otherwise changes pnpm’s configuration discovery. Any of these could cause the workspace allowlist to be ignored.

## Recommended Diagnostic Sequence

The advisor should run the following sequence before changing unrelated application code.

| Priority | Diagnostic | Expected evidence | Decision enabled |
|---:|---|---|---|
| 1 | Obtain the complete post-fix deployment log and its source commit/version ID. | `corepack pnpm --version`, effective working directory, install command, and the exact ignored-build error. | Confirms whether the failing build includes the configured repository state. |
| 2 | Inspect the generated build context immediately before install. | `pnpm-workspace.yaml` exists at the install working directory and contains the current three entries. | Distinguishes missing-context from pnpm parsing behavior. |
| 3 | Run the exact platform command with `corepack pnpm --version` logged. | Version is 10.33.0 or another explicit version; YAML is read. | Removes ambiguity about package-manager version. |
| 4 | Run a clean `CI=true pnpm@10.33.0 install --frozen-lockfile` in network-enabled CI with the current repository. | Either scripts run or the same ignored-build error repeats. | Establishes whether current `allowBuilds` works in the deployment pnpm major/minor. |
| 5 | If v10.33 still ignores `allowBuilds`, try the v10-documented compatibility representation in `pnpm-workspace.yaml`. | `onlyBuiltDependencies` includes `better-sqlite3` and `esbuild`; optional `bufferutil` is recorded as ignored. | Tests the version-appropriate config form. |
| 6 | Explicitly pin the package manager in the repository. | A `packageManager` entry (for example `pnpm@10.33.0` once verified) and a matching Corepack run. | Prevents local/deployment version drift. |

### v10-compatible configuration candidate to test

Do **not** add this alongside conflicting approval settings without testing. If the advisor confirms that pnpm 10.33.0 ignores the current map, replace or normalize the workspace configuration to the v10-documented form below, then reproduce the exact CI install:

```yaml
onlyBuiltDependencies:
  - better-sqlite3
  - esbuild

ignoredBuiltDependencies:
  - bufferutil
```

The intent is to permit only the packages needed for the build/runtime path, while leaving the optional WebSocket optimization unapproved. pnpm documents that v10 `approve-builds` writes approved packages to `onlyBuiltDependencies` and unapproved ones to `ignoredBuiltDependencies`.[2]

### Package-manager pinning candidate

After confirming the working pnpm version, add a matching field to `package.json` so Corepack has a repository-level version target:

```json
{
  "packageManager": "pnpm@10.33.0"
}
```

If the advisor validates pnpm 11 instead, pinning pnpm 11 with the existing `allowBuilds` syntax is likely the cleaner long-term route. The project should not claim reproducible deploys while local uses pnpm 11.18.0 and deployment may use pnpm 10.33.0 without a version declaration.

## Files Relevant to Review

| Path | Relevance |
|---|---|
| `pnpm-workspace.yaml` | Current build-script approval map. |
| `package.json` | Has build scripts but presently lacks `packageManager` and `engines` pins. |
| `pnpm-lock.yaml` | Must stay consistent with the dependency and package-manager decision. |
| `server/_core/index.ts` | Production server entry bundled by the build script. |
| `vite.config.ts` | Client build configuration used by `vite build`. |
| `PNPM_BUILD_APPROVAL.md` | Prior short summary of the attempted approval approach; this report supersedes its conclusion. |
| `DEPLOYMENT_ADVISOR_DIAGNOSIS.md` | This detailed evidence and decision record. |

## Assessment

The remaining problem should be treated as a **configuration reproduction issue** until proven otherwise. The build scripts are explicitly blocked by pnpm during the install phase; the repository-level allowlist is the right class of fix, but its effect has only been demonstrated under local pnpm 11.18.0. The deployment’s pnpm 10.33.0 runtime, source commit, and build-context handling have not been conclusively verified.

The most efficient next action is not another Dockerfile change. It is a controlled reproduction using the exact deployment pnpm version and command, with `pnpm-workspace.yaml` confirmed present in the working directory. If the current file is present but ignored, normalize to pnpm 10’s documented `onlyBuiltDependencies`/`ignoredBuiltDependencies` form and pin the validated pnpm version in `package.json`.

## References

[1]: https://pnpm.io/10.x/settings "pnpm 10.x Settings — configuration files and workspace settings"
[2]: https://pnpm.io/10.x/cli/approve-builds "pnpm 10.x approve-builds — approved and ignored build dependency settings"

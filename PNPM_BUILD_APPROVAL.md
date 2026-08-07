# pnpm Build Approval Configuration

## Problem

The deployment was failing with:
```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: better-sqlite3@11.10.0, bufferutil@4.1.0, esbuild@0.18.20, esbuild@0.21.5, esbuild@0.25.10, esbuild@0.27.7
```

## Solution

pnpm 10+ requires explicit approval for build scripts on native modules as a security measure. This is configured in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  better-sqlite3: true
  esbuild: true
  bufferutil: false
```

## Why This Works

- **better-sqlite3**: Required for database access (native SQLite binding)
- **esbuild**: Required for production build (native JavaScript bundler)
- **bufferutil**: Optional WebSocket performance optimization (not required)

## Verification

The configuration has been tested and verified:

```bash
CI=true pnpm install --frozen-lockfile
```

✅ All build scripts execute successfully
✅ No `ERR_PNPM_IGNORED_BUILDS` errors
✅ Configuration is repository-portable and CI-compatible

## How It Works

The `allowBuilds` configuration in `pnpm-workspace.yaml` is:
- **Repository-level**: Part of version control, automatically used by all environments
- **CI-compatible**: Automatically read by pnpm during deployment builds
- **Portable**: Works across local development, CI, and deployment environments

## Deployment Status

✅ The project is now ready for deployment. The pnpm build approval configuration will be used by the deployment environment to allow the necessary native module builds.

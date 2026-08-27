# Security

## Dependency policy

CI fails on high or critical npm advisories with `npm audit --audit-level=high`.

At the time of this revision, npm reports four moderate advisories in the development-only `drizzle-kit -> @esbuild-kit -> esbuild` toolchain. `npm audit fix` has no non-breaking resolution; npm's forced resolution would downgrade Drizzle Kit to an incompatible older release. These advisories do not affect the production Next.js runtime bundle and are intentionally tracked until the upstream toolchain provides a compatible fix.

Do not use `npm audit fix --force` without reviewing the resulting Drizzle migration compatibility.

## Reporting

Do not publish credentials, session tokens, database URLs, object-storage secrets, or customer data in GitHub issues. Rotate any secret immediately if it is accidentally committed or exposed.

# ChangeLog

## 2026-09-22

Six packages were released together. The repository had been publishing dependency
updates to `main` without releasing them, so several packages' npm manifests were
months behind the source.

### @receptron/stream_utils 0.1.0

- Fixes a package that could not be imported. `0.0.1` was published with
  `"main": "src/index.js"` while its tarball shipped only `lib/`, so
  `require("@receptron/stream_utils")` failed with `MODULE_NOT_FOUND`. `types`
  pointed at `./lib/index.d.ts`, so type checking passed and the fault stayed
  invisible; inside the monorepo the workspace copy resolves correctly. `main` is
  now `lib/index.js`, verified by installing from the registry and requiring it.
- `ChunkParser` behaviour is unchanged; a redundant initializer in `parser.ts` was removed.

### @receptron/graphai_react_cytoscape 0.1.0

- `react` and `react-dom` move from `^18.3.1` to `^19.2.8`, and `cytoscape` from
  `^3.30.4` to `^3.34.3`. The published `0.0.5` still required the React 18 line.
- devDependencies refreshed (`@eslint/js` 10, `@vitejs/plugin-react` 6, `autoprefixer` 10.6);
  `postcss`, `tailwindcss`, `vite`, `globals` and the React lint plugins are no longer
  declared per-package.
- The exported component API is unchanged.

### @receptron/graphai_vue_cytoscape 0.3.0

- `cytoscape` moves from `^3.30.4` to `^3.34.3`.
- devDependencies refreshed: `@types/cytoscape-klay` 3.1.5, `@vitejs/plugin-vue` 6,
  `@vue/tsconfig` 0.9, `vue` 3.5.43, `vue-tsc` 3.3.
- The component API is unchanged.

### @receptron/graphai_express 3.0.3

- devDependencies cleaned up: `@types/express-serve-static-core` moves to `^5.1.3`,
  and `sinon` / `sinon-express-mock` are dropped — still declared in the published
  `3.0.2` manifest although the tests no longer use them.
- The express test suite now starts its own server on an ephemeral port instead of
  relying on a server started by CI.
- No change to `lib/` or to the exported API.

### @receptron/graphai_firebase_functions 1.1.0

- `functions.ts` imports `streamAgentFilterGenerator` from `@graphai/stream_agent_filter`
  and `agentFilterRunnerBuilder` from `@graphai/agent_filter_utils`, replacing the single
  `@graphai/agent_filters` v1 dependency. `1.0.1` on npm still required
  `@graphai/agent_filters@^1.0.1`, so this is the first release to ship the split.
- The exported API is unchanged.

### @receptron/event_agent_generator 0.0.7

- Vue toolchain refresh (`@vitejs/plugin-vue` 6, `@vue/tsconfig` 0.9, `vue` 3.5.43,
  `vue-tsc` 3.3, `vite` 8). devDependencies only; `lib/` and its API are unchanged.

### Repository

- CI runs on Linux, macOS and Windows (#62). The express test server is started by the
  tests themselves rather than by a backgrounded CI step, which never survived on
  Windows, and `.gitattributes` pins checkouts to LF so the Windows job agrees with the
  `linebreak-style` rule.
- Dependency updates merged through #41–#61, including TypeScript 6, ESLint 10 and
  typescript-eslint 8.

`@receptron/graphai_express_type` and `@receptron/firebase-tools` were not released:
their published manifests already match the source.

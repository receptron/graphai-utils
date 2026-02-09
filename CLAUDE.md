# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo containing utility packages for GraphAI. Provides shared tools and integrations.

## Commands

```bash
yarn test       # Run tests across all workspaces
yarn build      # Build all packages
yarn eslint     # Run ESLint across all workspaces
yarn format     # Format all packages
yarn ci         # Run test, eslint, and build in sequence
```

## Architecture

Yarn workspaces monorepo with packages:
- `packages/express/` - Express.js integration
- `packages/express_type/` - Express type definitions
- `packages/stream_utils/` - Streaming utilities
- `packages/firebase_functions/` - Firebase Functions integration
- `packages/firebase-tools/` - Firebase tools
- `packages/vue-cytoscape/` - Vue Cytoscape visualization
- `packages/react-cytoscape/` - React Cytoscape visualization
- `packages/event_agent_generator/` - Event agent generator

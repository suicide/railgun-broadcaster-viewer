# Project Context for Agents

This document provides context for AI agents working on the **Railgun Broadcaster Viewer** project.

## Project Overview

This is a CLI tool written in TypeScript that interfaces with the
`@railgun-community/waku-broadcaster-client-node` library. Its primary purpose is to allow
developers and node operators to visualize the state of Railgun Relayers (Broadcasters) on the Waku
peer-to-peer network.

## Architecture

- **Entry Point**: `src/index.ts` - Handles CLI argument parsing using `commander` and
  initialization.
- **Core Logic**: `src/monitor.ts` - Manages the `WakuBroadcasterClient` lifecycle.
  - Initializes the Waku client.
  - Polls for broadcasters using `WakuBroadcasterClient.findAllBroadcastersForChain`.
  - Updates the UI loop.
- **UI**: `src/ui.ts` - Uses `cli-table3` and `chalk` to render formatted output to the console.
- **Configuration**: `src/types.ts` defines the `AppConfig` interface. Configuration is merged from
  defaults, JSON file, and CLI args.

## Key Dependencies

- **@railgun-community/waku-broadcaster-client-node**: The core SDK for interacting with the Railgun
  Waku network.
- **@railgun-community/shared-models**: Types and shared utilities (e.g., `Chain`, `Broadcaster`).
- **commander**: CLI framework.
- **cli-table3**: Terminal table rendering.
- **chalk**: Terminal string styling (v4 used for CommonJS compatibility).

## Development Guidelines

1.  **TypeScript**: Strict mode is enabled. Ensure all new code is typed correctly.
2.  **Formatting**: Use `npm run format` (Prettier) before committing.
3.  **Waku Interaction**: The Waku client requires a "Trusted Fee Signer" public key to validate
    fees and enforce variance limits against price gouging. The client waits for a broadcast from
    this signer to establish a baseline. Without it, the SDK may filter out valid broadcasters.
4.  **Logging**: Use the `logStatus` helper in `src/ui.ts` for consistent console logging.

## Common Tasks

- **Adding new columns**: Update `createBroadcasterTable` in `src/ui.ts`.
- **Changing polling logic**: Modify the `scan` method in `src/monitor.ts`.
- **Updating SDK**: Check for breaking changes in `@railgun-community/shared-models` if upgrading
  dependencies.

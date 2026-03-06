# Project Context for Agents

This document provides context for AI agents working on the **Railgun Broadcaster Viewer** project.

## Project Overview

This is a CLI tool written in TypeScript that interfaces with the
`@railgun-community/waku-broadcaster-client-node` library. Its primary purpose is to allow
developers and node operators to visualize the state of Railgun Relayers (Broadcasters) on the Waku
peer-to-peer network.

It uses **Ink** (React for CLI) to provide a rich, interactive Terminal User Interface (TUI).

## Architecture

- **Entry Point**: `src/index.ts` - Handles CLI argument parsing using `commander` and mounts the
  Ink React application.
- **Core Logic**: `src/monitor.ts` - Manages the `WakuBroadcasterClient` lifecycle.
  - Initializes the Waku client.
  - Polls for broadcasters using `WakuBroadcasterClient.findAllBroadcastersForChain`.
  - Extends `EventEmitter` to push updates (`update`, `log`, `status`) to the UI.
- **UI**: `src/ui/` - React components using `ink`.
  - `App.tsx`: Main container, layout manager, and global key handler.
  - `BroadcasterTable.tsx`: Sortable, filterable table of broadcasters.
  - `AddressList.tsx`: Selectable sidebar of unique addresses.
  - `LogPanel.tsx`: Scrollable log window.
- **Configuration**: `src/types.ts` defines the `AppConfig` interface. Configuration is merged from
  defaults, JSON file, and CLI args.

## Key Dependencies

- **@railgun-community/waku-broadcaster-client-node**: The core SDK for interacting with the Railgun
  Waku network.
- **ink**: React-based CLI renderer.
- **react**: UI component library.
- **commander**: CLI framework.
- **chalk**: Terminal string styling.

## Development Guidelines

1.  **TypeScript**: Strict mode is enabled. Ensure all new code is typed correctly.
2.  **Formatting**: Use `npm run format` (Prettier) before committing.
3.  **Waku Interaction**: The Waku client typically requires a "Trusted Fee Signer" public key to
    validate fees and enforce variance limits against price gouging. The client waits for a
    broadcast from this signer to establish a baseline. Without it (or the `--no-signer` flag), the
    SDK may filter out valid broadcasters.
4.  **State Management**: The `BroadcasterMonitor` class emits events. The React UI subscribes to
    these events in `useEffect` hooks to update local state.

## Common Tasks

- **Adding new columns**: Update `src/ui/BroadcasterTable.tsx` columns definition.
- **Changing polling logic**: Modify the `scan` method in `src/monitor.ts`.
- **Updating SDK**: Check for breaking changes in `@railgun-community/shared-models` if upgrading
  dependencies.
- **Logging**: Emit a 'log' event from the monitor: `this.emit('log', 'message')`.

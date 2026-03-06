# Refactor Plan: Ink TUI

## Phase 1: Project Configuration & ESM Migration

- [x] Update `package.json` to `"type": "module"`
- [x] Uninstall `ts-node`, install `tsx`
- [x] Update `tsconfig.json` for ESM (`"module": "NodeNext"`, `"moduleResolution": "NodeNext"`)
- [x] Install latest `ink`, `react`, `chalk`, `commander`, `ink-table` (if available/compatible) or
      build custom table
- [x] Verify basic CLI compilation/execution

## Phase 2: Logic Separation (The "Backend")

- [x] Refactor `BroadcasterMonitor` to extend `EventEmitter`
- [x] Remove `console.log`, `cli-table3`, `log-update` from `monitor.ts`
- [x] Implement `getBroadcasters()`, `getLogs()`, `getStatus()`
- [x] Create `src/test-monitor.ts` to verify data flow without UI

## Phase 3: Static TUI Implementation

- [x] Create `src/ui/App.tsx` (Layout)
- [x] Create `src/ui/BroadcasterTable.tsx` (Static Table)
- [x] Create `src/ui/AddressList.tsx` (Static List)
- [x] Create `src/ui/LogPanel.tsx` (Static Logs)
- [x] Update `src/index.ts` to mount Ink App

## Phase 4: Interactivity & Polish

- [x] Implement Focus Management (`Tab` / `Shift+Tab`)
- [x] Implement Scrolling & Navigation (`Arrow Keys`, `PgUp/Dn`, `Home/End`, Vim keys)
- [ ] Implement Sorting (`1-7` keys)
- [ ] Implement Filtering (`/` key + Search Input)
- [ ] Final Polish & Bug Fixes
  - [x] Full screen mode (`altScreen`)
  - [x] Dynamic list height (fix cutoff)
  - [x] Scroll indicators
  - [x] Unique & truncated address list

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { PeerStatusSnapshot } from '../types.js';
import {
  DEFAULT_PEER_TABLE_STATE,
  PeerSortKey,
  PeerTableRow,
  PeerTableState,
  createPeerRows,
  processPeerRows,
} from './peer-table-data.js';

interface Props {
  peerStatus: PeerStatusSnapshot;
  isFocused: boolean;
  height: number;
  width: number;
  filterMode: boolean;
  setFilterMode: (mode: boolean) => void;
  tableState: PeerTableState;
  setTableState: React.Dispatch<React.SetStateAction<PeerTableState>>;
  onSelectedPeerChange: (peer: PeerTableRow | null) => void;
}

const truncateMiddle = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const sideLength = Math.floor((maxLength - 3) / 2);
  return text.slice(0, sideLength) + '...' + text.slice(-sideLength);
};

const renderModeLabel = (mode: PeerTableState['mode']): string => {
  switch (mode) {
    case 'all':
      return 'all';
    case 'explicit':
      return 'explicit';
    case 'connected':
      return 'connected';
    case 'issues':
      return 'issues';
  }
};

export const PeerTable: React.FC<Props> = ({
  peerStatus,
  isFocused,
  height,
  width,
  filterMode,
  setFilterMode,
  tableState,
  setTableState,
  onSelectedPeerChange,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  const rows = useMemo(() => createPeerRows(peerStatus), [peerStatus]);
  const processedRows = useMemo(() => processPeerRows(rows, tableState), [rows, tableState]);

  const availableHeight = height - (filterMode ? 6 : 4);
  const limit = Math.max(1, availableHeight);
  const innerWidth = Math.max(20, width - 4);
  const colPeer = Math.floor(innerWidth * 0.36);
  const colState = Math.floor(innerWidth * 0.14);
  const colRole = Math.floor(innerWidth * 0.16);
  const colPx = Math.floor(innerWidth * 0.08);
  const colCaps = innerWidth - colPeer - colState - colRole - colPx;

  useEffect(() => {
    if (selectedIndex >= processedRows.length) {
      setSelectedIndex(Math.max(0, processedRows.length - 1));
      setOffset((current) => Math.min(current, Math.max(0, processedRows.length - limit)));
    }
  }, [processedRows.length, limit, selectedIndex]);

  useEffect(() => {
    onSelectedPeerChange(processedRows[selectedIndex] ?? null);
  }, [onSelectedPeerChange, processedRows, selectedIndex]);

  useInput((input, key) => {
    if (!isFocused) return;

    if (filterMode) {
      if (key.return) {
        setFilterMode(false);
      }
      return;
    }

    if (input === '/') {
      setFilterMode(true);
      return;
    }

    const handleSort = (sortKey: PeerSortKey) => {
      setTableState((currentState) => ({
        ...currentState,
        sortKey,
        sortDirection:
          currentState.sortKey === sortKey
            ? currentState.sortDirection === 'asc'
              ? 'desc'
              : 'asc'
            : 'asc',
      }));
    };

    if (input === '1') handleSort('peer');
    if (input === '2') handleSort('state');
    if (input === '3') handleSort('role');
    if (input === '4') handleSort('px');
    if (input === '5') handleSort('caps');

    if (input === 't') {
      setTableState((currentState) => {
        const order = ['all', 'explicit', 'connected', 'issues'] as const;
        const nextIndex = (order.indexOf(currentState.mode) + 1) % order.length;
        return { ...currentState, mode: order[nextIndex] };
      });
      return;
    }

    if (key.downArrow || input === 'j') {
      const nextIndex = Math.min(processedRows.length - 1, selectedIndex + 1);
      setSelectedIndex(nextIndex);
      if (nextIndex >= offset + limit) {
        setOffset(nextIndex - limit + 1);
      }
    }

    if (key.upArrow || input === 'k') {
      const prevIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(prevIndex);
      if (prevIndex < offset) {
        setOffset(prevIndex);
      }
    }

    if (key.pageDown) {
      const nextIndex = Math.min(processedRows.length - 1, selectedIndex + limit);
      setSelectedIndex(nextIndex);
      setOffset(Math.min(Math.max(0, processedRows.length - limit), offset + limit));
    }

    if (key.pageUp) {
      const prevIndex = Math.max(0, selectedIndex - limit);
      setSelectedIndex(prevIndex);
      setOffset(Math.max(0, offset - limit));
    }

    if (key.ctrl && input === 'd') {
      const halfPage = Math.floor(limit / 2);
      const nextIndex = Math.min(processedRows.length - 1, selectedIndex + halfPage);
      setSelectedIndex(nextIndex);
      setOffset(Math.min(Math.max(0, processedRows.length - limit), offset + halfPage));
    }

    if (key.ctrl && input === 'u') {
      const halfPage = Math.floor(limit / 2);
      const prevIndex = Math.max(0, selectedIndex - halfPage);
      setSelectedIndex(prevIndex);
      setOffset(Math.max(0, offset - halfPage));
    }
  });

  if (rows.length === 0) {
    return (
      <Box
        borderStyle="single"
        padding={1}
        borderColor={isFocused ? 'green' : 'white'}
        height={height}
        width={width}
      >
        <Text color="yellow">No peer data found yet.</Text>
      </Box>
    );
  }

  const visible = processedRows.slice(offset, offset + limit);

  const renderHeader = (label: string, key: PeerSortKey, colWidth: number) => {
    const isSorting = tableState.sortKey === key;
    const arrow = isSorting ? (tableState.sortDirection === 'asc' ? '↑' : '↓') : '';
    return (
      <Box width={colWidth}>
        <Text bold color={isSorting ? 'green' : 'cyan'}>
          {label} {arrow}
        </Text>
      </Box>
    );
  };

  const getRowColor = (row: PeerTableRow, isSelected: boolean): { fg: string; bg?: string } => {
    if (isSelected) {
      if (row.isExplicit && !row.isConnected) return { fg: 'black', bg: 'red' };
      if (row.isConnected) return { fg: 'black', bg: 'green' };
      return { fg: 'black', bg: 'yellow' };
    }

    if (row.isExplicit && !row.isConnected) return { fg: 'red' };
    if (row.isConnected) return { fg: 'green' };
    if (row.isExplicit) return { fg: 'yellow' };
    return { fg: 'white' };
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      height={height}
      width={width}
      borderColor={isFocused ? 'green' : 'white'}
    >
      <Box>
        {renderHeader('Peer (1)', 'peer', colPeer)}
        {renderHeader('State (2)', 'state', colState)}
        {renderHeader('Role (3)', 'role', colRole)}
        {renderHeader('PX (4)', 'px', colPx)}
        {renderHeader('Caps (5)', 'caps', colCaps)}
      </Box>
      <Box>
        <Text color="gray">Mode: {renderModeLabel(tableState.mode)} | `t` toggles mode</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((row, idx) => {
          const globalIndex = offset + idx;
          const isSelected = globalIndex === selectedIndex;
          const colors = getRowColor(row, isSelected);

          return (
            <Box key={row.peerId}>
              <Box width={colPeer}>
                <Text color={colors.fg} backgroundColor={colors.bg}>
                  {truncateMiddle(row.peerId, Math.max(6, colPeer - 1))}
                </Text>
              </Box>
              <Box width={colState}>
                <Text color={colors.fg} backgroundColor={colors.bg}>
                  {row.state}
                </Text>
              </Box>
              <Box width={colRole}>
                <Text color={colors.fg} backgroundColor={colors.bg}>
                  {row.role}
                </Text>
              </Box>
              <Box width={colPx}>
                <Text color={colors.fg} backgroundColor={colors.bg}>
                  {row.supportsPeerExchange ? 'yes' : 'no'}
                </Text>
              </Box>
              <Box width={colCaps}>
                <Text color={colors.fg} backgroundColor={colors.bg}>
                  {truncateMiddle(row.capabilities.join(',') || '-', Math.max(4, colCaps - 1))}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {filterMode && (
        <Box borderStyle="single" borderColor="yellow" height={3}>
          <Text>Filter: </Text>
          <TextInput
            value={tableState.filterQuery}
            onChange={(value) =>
              setTableState((currentState) => ({ ...currentState, filterQuery: value }))
            }
            focus={filterMode && isFocused}
            placeholder="Peer, state, role, cap, tag, addr"
          />
        </Box>
      )}

      {!filterMode && (
        <Box justifyContent="center" height={1}>
          {processedRows.length > limit ? (
            <Text color="gray">
              {offset > 0 ? '↑ Scroll Up ' : ''}
              {offset + limit < processedRows.length ? '↓ Scroll Down' : ''}
            </Text>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export { DEFAULT_PEER_TABLE_STATE };

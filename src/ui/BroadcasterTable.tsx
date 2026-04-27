import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { getTokenName } from '../tokens.js';
import { RAILWAY_SIGNERS, TERMINAL_SIGNERS } from '../signers.js';
import {
  BroadcasterTableState,
  SortKey,
  processBroadcasters,
  formatBroadcasterFee,
} from './broadcaster-table-data.js';

interface Props {
  broadcasters: SelectedBroadcaster[];
  chainId: number;
  isFocused: boolean;
  height: number;
  width: number;
  filterMode: boolean;
  setFilterMode: (mode: boolean) => void;
  tableState: BroadcasterTableState;
  setTableState: React.Dispatch<React.SetStateAction<BroadcasterTableState>>;
  trustedFeeSigners: string[];
  outOfBoundsBroadcasters: ReadonlySet<SelectedBroadcaster>;
}

const truncateMiddle = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const sideLength = Math.floor((maxLength - 3) / 2);
  return text.slice(0, sideLength) + '...' + text.slice(-sideLength);
};

export const BroadcasterTable: React.FC<Props> = ({
  broadcasters,
  chainId,
  isFocused,
  height,
  width,
  filterMode,
  setFilterMode,
  tableState,
  setTableState,
  trustedFeeSigners,
  outOfBoundsBroadcasters,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const { filterQuery, sortKey, sortDirection } = tableState;

  // Calculate visible rows
  const availableHeight = height - (filterMode ? 6 : 4);
  const limit = Math.max(1, availableHeight);

  // Calculate Column Widths
  const innerWidth = Math.max(0, width - 4); // Border (2) + Padding (2) approx
  const colAddress = Math.floor(innerWidth * 0.2);
  const colToken = Math.floor(innerWidth * 0.2);
  const colFee = Math.floor(innerWidth * 0.2);
  const colExp = Math.floor(innerWidth * 0.1);
  const colRel = Math.floor(innerWidth * 0.1);
  const colWallets = Math.floor(innerWidth * 0.1);
  const colAdapt = Math.floor(innerWidth * 0.1);

  // Filter and Sort
  const processedBroadcasters = useMemo(() => {
    return processBroadcasters(broadcasters, chainId, tableState);
  }, [broadcasters, chainId, tableState]);

  // Reset/adjust selection if list shrinks
  useEffect(() => {
    if (selectedIndex >= processedBroadcasters.length) {
      setSelectedIndex(Math.max(0, processedBroadcasters.length - 1));
      if (offset > Math.max(0, processedBroadcasters.length - limit)) {
        setOffset(Math.max(0, processedBroadcasters.length - limit));
      }
    }
  }, [processedBroadcasters.length, limit]);

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

    // Sorting keys
    const handleSort = (key: SortKey) => {
      setTableState((currentState) => ({
        ...currentState,
        sortKey: key,
        sortDirection:
          currentState.sortKey === key
            ? currentState.sortDirection === 'asc'
              ? 'desc'
              : 'asc'
            : 'asc',
      }));
    };

    if (input === '1') handleSort('address');
    if (input === '2') handleSort('token');
    if (input === '3') handleSort('fee');
    if (input === '4') handleSort('expiration');
    if (input === '5') handleSort('reliability');
    if (input === '6') handleSort('wallets');
    if (input === '7') handleSort('adapt');

    // Navigation
    if (key.downArrow || input === 'j') {
      const nextIndex = Math.min(processedBroadcasters.length - 1, selectedIndex + 1);
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
      const nextIndex = Math.min(processedBroadcasters.length - 1, selectedIndex + limit);
      setSelectedIndex(nextIndex);
      setOffset(Math.min(Math.max(0, processedBroadcasters.length - limit), offset + limit));
    }

    if (key.pageUp) {
      const prevIndex = Math.max(0, selectedIndex - limit);
      setSelectedIndex(prevIndex);
      setOffset(Math.max(0, offset - limit));
    }

    if (key.ctrl) {
      if (input === 'd') {
        const halfPage = Math.floor(limit / 2);
        const nextIndex = Math.min(processedBroadcasters.length - 1, selectedIndex + halfPage);
        setSelectedIndex(nextIndex);
        setOffset(Math.min(Math.max(0, processedBroadcasters.length - limit), offset + halfPage));
      }
      if (input === 'u') {
        const halfPage = Math.floor(limit / 2);
        const prevIndex = Math.max(0, selectedIndex - halfPage);
        setSelectedIndex(prevIndex);
        setOffset(Math.max(0, offset - halfPage));
      }
    }
  });

  if (broadcasters.length === 0) {
    return (
      <Box
        borderStyle="single"
        padding={1}
        borderColor={isFocused ? 'green' : 'white'}
        height={height}
        width={width}
      >
        <Text color="yellow">No broadcasters found yet.</Text>
      </Box>
    );
  }

  const visible = processedBroadcasters.slice(offset, offset + limit);

  const renderHeader = (label: string, key: SortKey, colWidth: number) => {
    const isSorting = sortKey === key;
    const arrow = isSorting ? (sortDirection === 'asc' ? '↑' : '↓') : '';
    return (
      <Box width={colWidth}>
        <Text bold color={isSorting ? 'green' : 'cyan'}>
          {label} {arrow}
        </Text>
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      height={height}
      width={width}
      borderColor={isFocused ? 'green' : 'white'}
    >
      {/* Header */}
      <Box borderBottom={false} borderTop={false} borderLeft={false} borderRight={false}>
        {renderHeader('Address (1)', 'address', colAddress)}
        {renderHeader('Token (2)', 'token', colToken)}
        {renderHeader('Fee (3)', 'fee', colFee)}
        {renderHeader('Exp. (4)', 'expiration', colExp)}
        {renderHeader('Rel. (5)', 'reliability', colRel)}
        {renderHeader('Wallets (6)', 'wallets', colWallets)}
        {renderHeader('Adapt (7)', 'adapt', colAdapt)}
      </Box>

      {/* Rows */}
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((b, idx) => {
          const globalIndex = offset + idx;
          const isSelected = globalIndex === selectedIndex;

          const address = truncateMiddle(b.railgunAddress, Math.max(5, colAddress - 1));

          let token = truncateMiddle(b.tokenAddress, Math.max(5, colToken - 1));
          const tokenName = getTokenName(chainId, b.tokenAddress);
          if (tokenName) {
            // Try to fit "Name (Addr)"
            const addrLen = Math.max(6, Math.floor(colToken - tokenName.length - 4));
            // If addrLen is too small, just show name? Or show "Name..."
            // Let's just do standard truncation if name present
            token = `${tokenName} (${truncateMiddle(b.tokenAddress, Math.max(4, addrLen))})`;
          }

          const reliability = Math.round(b.tokenFee.reliability * 100) + '%';
          const relayAdapt = truncateMiddle(b.tokenFee.relayAdapt, Math.max(5, colAdapt - 1));
          const feeFormatted = formatBroadcasterFee(b, chainId);
          const isOutOfBounds = outOfBoundsBroadcasters.has(b);

          // --- Highlighting Logic ---
          const isTrusted = trustedFeeSigners.includes(b.railgunAddress);
          const isPartner =
            !isTrusted &&
            (RAILWAY_SIGNERS.includes(b.railgunAddress) ||
              TERMINAL_SIGNERS.includes(b.railgunAddress));

          let rowColor = 'white';
          let rowBackgroundColor = undefined;

          if (isSelected) {
            // Selected Row Highlighting
            if (isTrusted) {
              rowColor = 'black';
              rowBackgroundColor = 'yellow';
            } else if (isPartner) {
              rowColor = 'black';
              rowBackgroundColor = 'cyan';
            } else if (isOutOfBounds) {
              rowColor = 'black';
              rowBackgroundColor = 'red';
            } else {
              rowColor = 'black';
              rowBackgroundColor = 'white';
            }
          } else {
            // Unselected Row Highlighting (Text Color Only)
            if (isTrusted) rowColor = 'yellow';
            else if (isPartner) rowColor = 'cyan';
            else if (isOutOfBounds) rowColor = 'red';
            else rowColor = 'white';
          }

          // Fee Color Override for Normal Rows
          let feeColor = rowColor;
          if (!isSelected && !isTrusted && !isPartner && !isOutOfBounds) {
            feeColor = 'green';
          }

          return (
            <Box key={`${b.railgunAddress}-${b.tokenAddress}-${globalIndex}`}>
              <Box width={colAddress}>
                <Text color={rowColor} backgroundColor={rowBackgroundColor}>
                  {address}
                </Text>
              </Box>
              <Box width={colToken}>
                <Text color={rowColor} backgroundColor={rowBackgroundColor}>
                  {token}
                </Text>
              </Box>
              <Box width={colFee}>
                <Text color={feeColor} backgroundColor={rowBackgroundColor}>
                  {feeFormatted}
                </Text>
              </Box>
              <Box width={colExp}>
                <Text color={rowColor} backgroundColor={rowBackgroundColor}>
                  {new Date(b.tokenFee.expiration).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Box>
              <Box width={colRel}>
                <Text color={rowColor} backgroundColor={rowBackgroundColor}>
                  {reliability}
                </Text>
              </Box>
              <Box width={colWallets}>
                <Text color={rowColor} backgroundColor={rowBackgroundColor}>
                  {b.tokenFee.availableWallets}
                </Text>
              </Box>
              <Box width={colAdapt}>
                <Text color={rowColor} backgroundColor={rowBackgroundColor}>
                  {relayAdapt}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Filter Input */}
      {filterMode && (
        <Box borderStyle="single" borderColor="yellow" height={3}>
          <Text>Filter: </Text>
          <TextInput
            value={filterQuery}
            onChange={(value) =>
              setTableState((currentState) => ({ ...currentState, filterQuery: value }))
            }
            focus={filterMode && isFocused}
            placeholder="Address, Token, or Name"
          />
        </Box>
      )}

      {/* Scroll Indicator */}
      {!filterMode && (
        <Box justifyContent="center" height={1}>
          {processedBroadcasters.length > limit ? (
            <Text color="gray">
              {offset > 0 ? '↑ Scroll Up ' : ''}
              {offset + limit < processedBroadcasters.length ? '↓ Scroll Down' : ''}
            </Text>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

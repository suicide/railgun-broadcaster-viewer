import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { formatUnits } from 'ethers';
import { getTokenName, isChainNativeToken, getTokenDecimals } from '../tokens.js';

interface Props {
  broadcasters: SelectedBroadcaster[];
  chainId: number;
  isFocused: boolean;
  height: number;
  width: number;
  filterMode: boolean;
  setFilterMode: (mode: boolean) => void;
}

type SortKey = 'address' | 'token' | 'fee' | 'expiration' | 'reliability' | 'wallets' | 'adapt';

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
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('fee');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterQuery, setFilterQuery] = useState('');

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
    let filtered = broadcasters;
    if (filterQuery) {
      const lowerQuery = filterQuery.toLowerCase();
      filtered = broadcasters.filter(
        (b) =>
          b.railgunAddress.toLowerCase().includes(lowerQuery) ||
          b.tokenAddress.toLowerCase().includes(lowerQuery) ||
          (getTokenName(chainId, b.tokenAddress) || '').toLowerCase().includes(lowerQuery)
      );
    }

    return filtered.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortKey) {
        case 'address':
          valA = a.railgunAddress;
          valB = b.railgunAddress;
          break;
        case 'token':
          valA = getTokenName(chainId, a.tokenAddress) || a.tokenAddress;
          valB = getTokenName(chainId, b.tokenAddress) || b.tokenAddress;
          break;
        case 'fee':
          try {
            valA = BigInt(a.tokenFee.feePerUnitGas ?? 0);
          } catch {
            valA = BigInt(0);
          }
          try {
            valB = BigInt(b.tokenFee.feePerUnitGas ?? 0);
          } catch {
            valB = BigInt(0);
          }
          break;
        case 'expiration':
          valA = a.tokenFee.expiration;
          valB = b.tokenFee.expiration;
          break;
        case 'reliability':
          valA = a.tokenFee.reliability;
          valB = b.tokenFee.reliability;
          break;
        case 'wallets':
          valA = a.tokenFee.availableWallets;
          valB = b.tokenFee.availableWallets;
          break;
        case 'adapt':
          valA = a.tokenFee.relayAdapt;
          valB = b.tokenFee.relayAdapt;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [broadcasters, filterQuery, sortKey, sortDirection, chainId]);

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
      if (sortKey === key) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDirection('asc');
      }
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

          // Format Fee
          const decimals = getTokenDecimals(chainId, b.tokenAddress);
          const feeRaw = b.tokenFee.feePerUnitGas;
          let feeFormatted = '';

          if (isChainNativeToken(chainId, b.tokenAddress)) {
            const feeGwei = parseFloat(formatUnits(feeRaw, 9));
            feeFormatted = `${feeGwei.toFixed(2)} Gwei`;
          } else {
            const val = parseFloat(formatUnits(feeRaw, decimals));
            let valStr = '';
            if (val === 0) {
              valStr = '0';
            } else if (val < 0.0001) {
              valStr = val.toExponential(2);
            } else {
              valStr = val.toFixed(6).replace(/\.?0+$/, '');
            }
            feeFormatted = `${valStr} ${tokenName || ''}`;
          }

          return (
            <Box key={`${b.railgunAddress}-${b.tokenAddress}-${globalIndex}`}>
              <Box width={colAddress}>
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {address}
                </Text>
              </Box>
              <Box width={colToken}>
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {token}
                </Text>
              </Box>
              <Box width={colFee}>
                <Text
                  color={isSelected ? 'black' : 'green'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {feeFormatted}
                </Text>
              </Box>
              <Box width={colExp}>
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {new Date(b.tokenFee.expiration).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Box>
              <Box width={colRel}>
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {reliability}
                </Text>
              </Box>
              <Box width={colWallets}>
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {b.tokenFee.availableWallets}
                </Text>
              </Box>
              <Box width={colAdapt}>
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
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
            onChange={setFilterQuery}
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

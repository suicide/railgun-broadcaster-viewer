import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { formatUnits } from 'ethers';
import { getTokenName, isChainNativeToken, getTokenDecimals } from '../tokens.js';

interface Props {
  broadcasters: SelectedBroadcaster[];
  chainId: number;
  isFocused: boolean;
  height: number;
}

const truncateMiddle = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const sideLength = Math.floor((maxLength - 3) / 2);
  return text.slice(0, sideLength) + '...' + text.slice(-sideLength);
};

export const BroadcasterTable: React.FC<Props> = ({ broadcasters, chainId, isFocused, height }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  // Calculate visible rows. Height includes borders (2) + Header (1) + Footer (1)
  const limit = Math.max(1, height - 4);

  // Reset/adjust selection if list shrinks
  useEffect(() => {
    if (selectedIndex >= broadcasters.length) {
      setSelectedIndex(Math.max(0, broadcasters.length - 1));
    }
  }, [broadcasters.length]);

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.downArrow || input === 'j') {
      const nextIndex = Math.min(broadcasters.length - 1, selectedIndex + 1);
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
      const nextIndex = Math.min(broadcasters.length - 1, selectedIndex + limit);
      setSelectedIndex(nextIndex);
      setOffset(Math.min(Math.max(0, broadcasters.length - limit), offset + limit));
    }

    if (key.pageUp) {
      const prevIndex = Math.max(0, selectedIndex - limit);
      setSelectedIndex(prevIndex);
      setOffset(Math.max(0, offset - limit));
    }
  });

  if (broadcasters.length === 0) {
    return (
      <Box
        borderStyle="single"
        padding={1}
        borderColor={isFocused ? 'green' : 'white'}
        height={height}
        width="100%"
      >
        <Text color="yellow">No broadcasters found yet.</Text>
      </Box>
    );
  }

  const visible = broadcasters.slice(offset, offset + limit);
  const scrollPercent = Math.min(
    100,
    Math.max(0, Math.round((offset / (broadcasters.length - limit)) * 100))
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      height={height}
      borderColor={isFocused ? 'green' : 'white'}
    >
      {/* Header */}
      <Box borderBottom={false} borderTop={false} borderLeft={false} borderRight={false}>
        <Box width="20%">
          <Text bold color="cyan">
            Address
          </Text>
        </Box>
        <Box width="20%">
          <Text bold color="cyan">
            Token
          </Text>
        </Box>
        <Box width="20%">
          <Text bold color="cyan">
            Fee
          </Text>
        </Box>
        <Box width="10%">
          <Text bold color="cyan">
            Exp.
          </Text>
        </Box>
        <Box width="10%">
          <Text bold color="cyan">
            Rel.
          </Text>
        </Box>
        <Box width="10%">
          <Text bold color="cyan">
            Wallets
          </Text>
        </Box>
        <Box width="10%">
          <Text bold color="cyan">
            Adapt
          </Text>
        </Box>
      </Box>

      {/* Rows */}
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((b, idx) => {
          const globalIndex = offset + idx;
          const isSelected = globalIndex === selectedIndex;

          const address = truncateMiddle(b.railgunAddress, 20);
          let token = truncateMiddle(b.tokenAddress, 16);
          const tokenName = getTokenName(chainId, b.tokenAddress);
          if (tokenName) {
            token = `${tokenName} (${truncateMiddle(b.tokenAddress, 6)})`;
          }

          const reliability = Math.round(b.tokenFee.reliability * 100) + '%';
          const relayAdapt = truncateMiddle(b.tokenFee.relayAdapt, 10);

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
              <Box width="20%">
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {address}
                </Text>
              </Box>
              <Box width="20%">
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {token}
                </Text>
              </Box>
              <Box width="20%">
                <Text
                  color={isSelected ? 'black' : 'green'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {feeFormatted}
                </Text>
              </Box>
              <Box width="10%">
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
              <Box width="10%">
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {reliability}
                </Text>
              </Box>
              <Box width="10%">
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? 'green' : undefined}
                >
                  {b.tokenFee.availableWallets}
                </Text>
              </Box>
              <Box width="10%">
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

      {/* Scroll Indicator */}
      <Box justifyContent="center" height={1}>
        {broadcasters.length > limit ? (
          <Text color="gray">
            {offset > 0 ? '↑ Scroll Up ' : ''}
            {offset + limit < broadcasters.length ? '↓ Scroll Down' : ''}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

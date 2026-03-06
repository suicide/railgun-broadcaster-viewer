import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { getWalletType } from '../signers.js';

interface Props {
  broadcasters: SelectedBroadcaster[];
  isFocused: boolean;
  height: number;
  width: number;
  selectedAddresses: Set<string>;
  toggleAddress: (address: string) => void;
}

const truncateMiddle = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const sideLength = Math.floor((maxLength - 3) / 2);
  return text.slice(0, sideLength) + '...' + text.slice(-sideLength);
};

export const AddressList: React.FC<Props> = ({
  broadcasters,
  isFocused,
  height,
  width,
  selectedAddresses,
  toggleAddress,
}) => {
  // Extract unique addresses
  const uniqueAddresses = Array.from(new Set(broadcasters.map((b) => b.railgunAddress)));

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  // Calculate visible rows. Height includes borders (2) + Header (1) + Footer (1)
  const limit = Math.max(1, height - 4);

  // Reset/adjust selection if list shrinks
  useEffect(() => {
    if (selectedIndex >= uniqueAddresses.length) {
      setSelectedIndex(Math.max(0, uniqueAddresses.length - 1));
    }
    // Adjust offset if needed
    if (offset > Math.max(0, uniqueAddresses.length - limit)) {
      setOffset(Math.max(0, uniqueAddresses.length - limit));
    }
  }, [uniqueAddresses.length, limit, offset, selectedIndex]);

  useInput((input, key) => {
    if (!isFocused) return;

    if (input === ' ') {
      const address = uniqueAddresses[selectedIndex];
      if (address) {
        toggleAddress(address);
      }
    }

    if (key.downArrow || input === 'j') {
      const nextIndex = Math.min(uniqueAddresses.length - 1, selectedIndex + 1);
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
      const nextIndex = Math.min(uniqueAddresses.length - 1, selectedIndex + limit);
      setSelectedIndex(nextIndex);
      setOffset(Math.min(Math.max(0, uniqueAddresses.length - limit), offset + limit));
    }

    if (key.pageUp) {
      const prevIndex = Math.max(0, selectedIndex - limit);
      setSelectedIndex(prevIndex);
      setOffset(Math.max(0, offset - limit));
    }

    if (key.ctrl) {
      if (input === 'd') {
        const halfPage = Math.floor(limit / 2);
        const nextIndex = Math.min(uniqueAddresses.length - 1, selectedIndex + halfPage);
        setSelectedIndex(nextIndex);
        setOffset(Math.min(Math.max(0, uniqueAddresses.length - limit), offset + halfPage));
      }
      if (input === 'u') {
        const halfPage = Math.floor(limit / 2);
        const prevIndex = Math.max(0, selectedIndex - halfPage);
        setSelectedIndex(prevIndex);
        setOffset(Math.max(0, offset - halfPage));
      }
    }
  });

  const visible = uniqueAddresses.slice(offset, offset + limit);
  const availableWidth = Math.max(0, width - 4); // Border(2) + Padding(2) approx

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      height={height}
      width={width}
      borderColor={isFocused ? 'green' : 'white'}
    >
      <Text bold underline>
        Addresses ({uniqueAddresses.length})
      </Text>
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((address, idx) => {
          const globalIndex = offset + idx;
          const isSelected = globalIndex === selectedIndex;
          const isChecked = selectedAddresses.has(address);

          const prefix = isChecked ? '[x] ' : '[ ] ';
          const truncLen = Math.max(5, availableWidth - prefix.length);
          const displayAddress = truncateMiddle(address, truncLen);

          const walletType = getWalletType(address);
          let itemColor = 'white';
          let itemBackgroundColor = undefined;

          if (isSelected) {
            // Selected Highlighting (Cursor)
            if (walletType === 'railway') {
              itemColor = 'black';
              itemBackgroundColor = 'cyan';
            } else if (walletType === 'terminal') {
              itemColor = 'white';
              itemBackgroundColor = 'magenta';
            } else if (walletType === 'both') {
              itemColor = 'white';
              itemBackgroundColor = 'blue';
            } else {
              itemColor = 'black';
              itemBackgroundColor = 'green';
            }
          } else {
            // Unselected Highlighting
            if (walletType === 'railway') itemColor = 'cyan';
            else if (walletType === 'terminal') itemColor = 'magenta';
            else if (walletType === 'both') itemColor = 'blue';
            else {
              itemColor = isChecked ? 'green' : 'white';
            }
          }

          return (
            <Box key={globalIndex}>
              <Text color={itemColor} backgroundColor={itemBackgroundColor}>
                {prefix}
                {displayAddress}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Scroll Indicators */}
      <Box justifyContent="center" height={1}>
        {uniqueAddresses.length > limit ? (
          <Text color="gray">
            {offset > 0 ? '↑' : ' '} {offset + limit < uniqueAddresses.length ? '↓' : ' '}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

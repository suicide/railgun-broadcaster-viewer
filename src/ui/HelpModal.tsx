import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  viewMode: 'broadcasters' | 'peers';
  width: number;
  height: number;
}

type Row =
  | { type: 'title'; value: string }
  | { type: 'section'; value: string }
  | { type: 'blank' }
  | { type: 'columns'; left: string; middle?: string; right?: string; color?: string };

const pad = (value: string, width: number): string => {
  if (value.length >= width) {
    return value.slice(0, width);
  }

  return value + ' '.repeat(width - value.length);
};

const PEER_ROWS: Row[] = [
  { type: 'title', value: 'Peer Help' },
  { type: 'blank' },
  { type: 'section', value: 'Colors' },
  {
    type: 'columns',
    left: 'green',
    middle: 'Connected',
    right: 'Peer currently connected',
    color: 'green',
  },
  {
    type: 'columns',
    left: 'yellow',
    middle: 'Explicit known',
    right: 'Configured peer seen, not connected',
    color: 'yellow',
  },
  {
    type: 'columns',
    left: 'red',
    middle: 'Explicit issue',
    right: 'Configured peer not observed',
    color: 'red',
  },
  {
    type: 'columns',
    left: 'white',
    middle: 'Discovered',
    right: 'Discovery-derived peer',
    color: 'white',
  },
  { type: 'blank' },
  { type: 'section', value: 'Modes' },
  {
    type: 'columns',
    left: 'all',
    middle: 'Show everything',
    right: 'Explicit and discovered peers',
  },
  { type: 'columns', left: 'explicit', middle: 'Configured only', right: 'Only explicit peers' },
  {
    type: 'columns',
    left: 'connected',
    middle: 'Connected only',
    right: 'Only active connections',
  },
  {
    type: 'columns',
    left: 'issues',
    middle: 'Troubleshooting',
    right: 'Explicit peers with problems',
  },
  { type: 'blank' },
  { type: 'section', value: 'Keys' },
  { type: 'columns', left: 'p', middle: 'Switch view', right: 'Broadcasters <-> peers' },
  { type: 'columns', left: 't', middle: 'Toggle mode', right: 'Cycle peer table mode' },
  { type: 'columns', left: '/', middle: 'Filter', right: 'Search peer rows' },
  { type: 'columns', left: '1-5', middle: 'Sort', right: 'Sort peer table columns' },
  { type: 'columns', left: 'Tab', middle: 'Cycle focus', right: 'Table, details, logs' },
  { type: 'columns', left: 'j/k', middle: 'Move', right: 'Row/detail/log navigation' },
  { type: 'columns', left: 'PgUp/PgDn', middle: 'Page', right: 'Page navigation' },
  { type: 'columns', left: 'Ctrl-U/D', middle: 'Half page', right: 'Half-page navigation' },
  { type: 'columns', left: '?', middle: 'Toggle help', right: 'Open or close this window' },
  { type: 'columns', left: 'Esc', middle: 'Close help', right: 'Dismiss overlay' },
];

const BROADCASTER_ROWS: Row[] = [
  { type: 'title', value: 'Broadcaster Help' },
  { type: 'blank' },
  { type: 'section', value: 'Keys' },
  { type: 'columns', left: 'p', middle: 'Switch view', right: 'Broadcasters <-> peers' },
  { type: 'columns', left: 's', middle: 'Save snapshot', right: 'Write current table CSV' },
  { type: 'columns', left: '/', middle: 'Filter', right: 'Search broadcaster rows' },
  { type: 'columns', left: '1-7', middle: 'Sort', right: 'Sort broadcaster columns' },
  { type: 'columns', left: 'Tab', middle: 'Cycle focus', right: 'Table, addresses, logs' },
  { type: 'columns', left: 'j/k', middle: 'Move', right: 'Row/list/log navigation' },
  { type: 'columns', left: 'PgUp/PgDn', middle: 'Page', right: 'Page navigation' },
  { type: 'columns', left: 'Ctrl-U/D', middle: 'Half page', right: 'Half-page navigation' },
  { type: 'columns', left: '?', middle: 'Toggle help', right: 'Open or close this window' },
  { type: 'columns', left: 'Esc', middle: 'Close help', right: 'Dismiss help or freeze view' },
];

export const HelpModal: React.FC<Props> = ({ viewMode, width, height }) => {
  const rows = viewMode === 'peers' ? PEER_ROWS : BROADCASTER_ROWS;
  const modalWidth = Math.min(96, Math.max(64, width - 8));
  const modalHeight = Math.min(rows.length + 4, Math.max(14, height - 6));
  const padX = Math.max(0, Math.floor((width - modalWidth) / 2));
  const padY = Math.max(0, Math.floor((height - modalHeight) / 2));
  const innerWidth = modalWidth - 4;
  const leftWidth = 12;
  const middleWidth = 18;
  const rightWidth = Math.max(10, innerWidth - leftWidth - middleWidth - 4);
  const visibleRows = rows.slice(0, modalHeight - 2);

  return (
    <Box position="absolute" width={width} height={height} flexDirection="column">
      {padY > 0 ? <Box height={padY} /> : null}
      <Box paddingLeft={padX}>
        <Box
          flexDirection="column"
          width={modalWidth}
          height={modalHeight}
          borderStyle="double"
          borderColor="cyan"
          backgroundColor="black"
          paddingX={1}
        >
          {visibleRows.map((row, index) => {
            if (row.type === 'blank') {
              return (
                <Text key={`row-${index}`} backgroundColor="black">
                  {pad('', innerWidth)}
                </Text>
              );
            }

            if (row.type === 'title') {
              return (
                <Text key={`row-${index}`} color="magenta" bold backgroundColor="black">
                  {pad(row.value, innerWidth)}
                </Text>
              );
            }

            if (row.type === 'section') {
              return (
                <Text key={`row-${index}`} color="cyan" bold backgroundColor="black">
                  {pad(row.value, innerWidth)}
                </Text>
              );
            }

            return (
              <Text key={`row-${index}`} backgroundColor="black">
                <Text color={row.color} bold>
                  {pad(row.left, leftWidth)}
                </Text>
                <Text color="yellow">{pad(row.middle ?? '', middleWidth)}</Text>
                <Text color="white">{pad(row.right ?? '', rightWidth)}</Text>
              </Text>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

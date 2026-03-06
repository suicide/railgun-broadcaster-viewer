import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { BroadcasterMonitor } from '../monitor.js';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { BroadcasterTable } from './BroadcasterTable.js';
import { AddressList } from './AddressList.js';
import { LogPanel } from './LogPanel.js';

interface Props {
  monitor: BroadcasterMonitor;
  chainId: number;
}

interface Log {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: Date;
}

type FocusArea = 'table' | 'address' | 'logs';

export const App: React.FC<Props> = ({ monitor, chainId }) => {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    columns: stdout.columns,
    rows: stdout.rows,
  });

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        columns: stdout.columns,
        rows: stdout.rows,
      });
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  const [broadcasters, setBroadcasters] = useState<SelectedBroadcaster[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState({
    status: 'Initializing',
    peers: 0,
    lastScan: null as Date | null,
  });
  const [focus, setFocus] = useState<FocusArea>('table');

  useEffect(() => {
    const onUpdate = (data: SelectedBroadcaster[]) => setBroadcasters(data);
    const onLog = (log: Log) => setLogs((prev) => [...prev, log]);
    const onStatus = (s: any) => setStatus(s);

    monitor.on('update', onUpdate);
    monitor.on('log', onLog);
    monitor.on('status', onStatus);

    return () => {
      monitor.off('update', onUpdate);
      monitor.off('log', onLog);
      monitor.off('status', onStatus);
    };
  }, [monitor]);

  useInput((input, key) => {
    if (key.tab) {
      if (key.shift) {
        // Prev focus
        if (focus === 'table') setFocus('logs');
        else if (focus === 'logs') setFocus('address');
        else setFocus('table');
      } else {
        // Next focus
        if (focus === 'table') setFocus('address');
        else if (focus === 'address') setFocus('logs');
        else setFocus('table');
      }
    }
  });

  // Dynamic Height Calculation
  // Header: 3 rows (border top, content, border bottom)
  // Logs: 10 rows
  // Spacing/Margin: 0
  // Content Height = Total - 13
  const contentHeight = Math.max(5, dimensions.rows - 13);

  return (
    <Box flexDirection="column" height={dimensions.rows}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1} height={3}>
        <Text>
          <Text bold color="magenta">
            Railgun Broadcaster Viewer
          </Text>{' '}
          | Status:{' '}
          <Text color={status.status === 'Connected' ? 'green' : 'yellow'}>{status.status}</Text> |
          Peers: {status.peers} | Last Scan:{' '}
          {status.lastScan ? status.lastScan.toLocaleTimeString() : 'Pending'}
        </Text>
      </Box>

      {/* Main Content Area */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left: Table */}
        <Box width="70%" flexDirection="column">
          <BroadcasterTable
            broadcasters={broadcasters}
            chainId={chainId}
            isFocused={focus === 'table'}
            height={contentHeight}
          />
        </Box>

        {/* Right: Address List */}
        <Box width="30%" flexDirection="column">
          <AddressList
            broadcasters={broadcasters}
            isFocused={focus === 'address'}
            height={contentHeight}
          />
        </Box>
      </Box>

      {/* Bottom: Logs */}
      <Box height={10}>
        <LogPanel logs={logs} isFocused={focus === 'logs'} />
      </Box>
    </Box>
  );
};

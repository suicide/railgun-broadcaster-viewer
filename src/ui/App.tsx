import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { BroadcasterMonitor } from '../monitor.js';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { BroadcasterTable } from './BroadcasterTable.js';
import { AddressList } from './AddressList.js';
import { LogPanel } from './LogPanel.js';
import { getNetworkName } from '../networks.js';
import { identifySignerSet } from '../signers.js';

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
  const [frozenBroadcasters, setFrozenBroadcasters] = useState<SelectedBroadcaster[] | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState({
    status: 'Initializing',
    peers: 0,
    lastScan: null as Date | null,
    trustedFeeSigners: [] as string[],
  });
  const [focus, setFocus] = useState<FocusArea>('table');
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState(false);

  useEffect(() => {
    const onUpdate = (data: SelectedBroadcaster[]) => setBroadcasters(data);
    const onLog = (log: Log) => setLogs((prev) => [...prev, log]);
    const onStatus = (s: any) => setStatus(s);

    monitor.on('update', onUpdate);
    monitor.on('log', onLog);
    monitor.on('status', onStatus);

    // Initial status set
    setStatus(monitor.getStatus());

    return () => {
      monitor.off('update', onUpdate);
      monitor.off('log', onLog);
      monitor.off('status', onStatus);
    };
  }, [monitor]);

  const currentData = frozenBroadcasters || broadcasters;

  const filteredBroadcasters = useMemo(() => {
    if (selectedAddresses.size === 0) return currentData;
    return currentData.filter((b) => selectedAddresses.has(b.railgunAddress));
  }, [currentData, selectedAddresses]);

  useInput((input, key) => {
    if (key.escape) {
      if (filterMode) {
        setFilterMode(false);
      } else {
        // Toggle Freeze
        if (frozenBroadcasters) {
          setFrozenBroadcasters(null);
        } else {
          setFrozenBroadcasters(broadcasters);
        }
      }
      return;
    }

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

  // Dynamic Height & Width Calculation
  // Header: 3 rows
  // Logs: 10 rows
  // Content Height = Total - 13
  const contentHeight = Math.max(5, dimensions.rows - 13);
  const tableWidth = Math.floor(dimensions.columns * 0.7);
  const addressWidth = dimensions.columns - tableWidth;

  const toggleAddress = (address: string) => {
    const next = new Set(selectedAddresses);
    if (next.has(address)) next.delete(address);
    else next.add(address);
    setSelectedAddresses(next);
  };

  const isFrozen = frozenBroadcasters !== null;

  const signerSetType = identifySignerSet(status.trustedFeeSigners);
  const signerStatusColor =
    signerSetType === 'none' ? 'red' : signerSetType === 'custom' ? 'yellow' : 'green';

  const signerLabel =
    signerSetType === 'none'
      ? '[NO SIGNER]'
      : signerSetType === 'railway'
        ? '[RAILWAY]'
        : signerSetType === 'terminal'
          ? '[TERMINAL]'
          : '[CUSTOM]';

  return (
    <Box flexDirection="column" height={dimensions.rows}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1} height={3}>
        <Text>
          <Text bold color="magenta">
            Railgun Broadcaster Viewer
          </Text>{' '}
          | Network:{' '}
          <Text bold color="cyan">
            {getNetworkName(chainId)}
          </Text>{' '}
          ({chainId}) | Status:{' '}
          <Text color={status.status === 'Connected' ? 'green' : 'yellow'}>{status.status}</Text> |
          Peers: {status.peers} | Last Scan:{' '}
          {status.lastScan ? status.lastScan.toLocaleTimeString() : 'Pending'}
          {isFrozen && (
            <Text color="cyan" bold>
              {' '}
              | [FROZEN]
            </Text>
          )}
          <Text color={signerStatusColor} bold>
            {' '}
            | {signerLabel}
          </Text>
        </Text>
      </Box>

      {/* Main Content Area */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left: Table */}
        <Box width={tableWidth} flexDirection="column">
          <BroadcasterTable
            broadcasters={filteredBroadcasters}
            chainId={chainId}
            isFocused={focus === 'table'}
            height={contentHeight}
            width={tableWidth}
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            trustedFeeSigners={status.trustedFeeSigners}
          />
        </Box>

        {/* Right: Address List */}
        <Box width={addressWidth} flexDirection="column">
          <AddressList
            broadcasters={currentData}
            isFocused={focus === 'address'}
            height={contentHeight}
            width={addressWidth}
            selectedAddresses={selectedAddresses}
            toggleAddress={toggleAddress}
            trustedFeeSigners={status.trustedFeeSigners}
          />
        </Box>
      </Box>

      {/* Bottom: Logs */}
      <Box height={10} width="100%">
        <LogPanel logs={logs} isFocused={focus === 'logs'} />
      </Box>
    </Box>
  );
};

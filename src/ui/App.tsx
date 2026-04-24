import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import fs from 'fs';
import path from 'path';
import { BroadcasterMonitor } from '../monitor.js';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { BroadcasterTable } from './BroadcasterTable.js';
import { AddressList } from './AddressList.js';
import { LogPanel } from './LogPanel.js';
import { PeerDetails } from './PeerDetails.js';
import { DEFAULT_PEER_TABLE_STATE, PeerTable } from './PeerTable.js';
import { getNetworkName } from '../networks.js';
import { identifySignerSet } from '../signers.js';
import { PeerStatusSnapshot } from '../types.js';
import { PeerTableRow, PeerTableState } from './peer-table-data.js';
import {
  createBroadcasterSnapshotCsv,
  DEFAULT_BROADCASTER_TABLE_STATE,
  processBroadcasters,
} from './broadcaster-table-data.js';

interface Props {
  monitor: BroadcasterMonitor;
  chainId: number;
  screenshotDir: string;
}

interface Log {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: Date;
}

type FocusArea = 'table' | 'address' | 'logs' | 'peers' | 'peer-details';
type ViewMode = 'broadcasters' | 'peers';

export const App: React.FC<Props> = ({ monitor, chainId, screenshotDir }) => {
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
    peerStatus: {
      runtime: {
        hasWaku: false,
        isStarted: false,
        useDNSDiscovery: true,
        dnsDiscoveryUrls: [],
      },
      routing: {
        contentTopics: [],
      },
      connections: {
        count: 0,
        peers: [],
      },
      peerStore: {
        count: 0,
        bootstrapCount: 0,
        peerExchangeCount: 0,
        bootstrapPeers: [],
        peerExchangePeers: [],
      },
      connectedPeers: [],
      configuredPeers: [],
      summary: {
        connectedPeerCount: 0,
        peerExchangeCapableCount: 0,
        configuredDirectPeerCount: 0,
        configuredDirectConnectedCount: 0,
        configuredStorePeerCount: 0,
        configuredStoreConnectedCount: 0,
        configuredUnavailableCount: 0,
      },
    } as PeerStatusSnapshot,
  });
  const [focus, setFocus] = useState<FocusArea | 'peers'>('table');
  const [viewMode, setViewMode] = useState<ViewMode>('broadcasters');
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState(false);
  const [tableState, setTableState] = useState(DEFAULT_BROADCASTER_TABLE_STATE);
  const [peerFilterMode, setPeerFilterMode] = useState(false);
  const [peerTableState, setPeerTableState] = useState<PeerTableState>(DEFAULT_PEER_TABLE_STATE);
  const [selectedPeer, setSelectedPeer] = useState<PeerTableRow | null>(null);

  const addAppLog = (message: string, type: Log['type'] = 'info') => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
  };

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

  const processedBroadcasters = useMemo(() => {
    return processBroadcasters(filteredBroadcasters, chainId, tableState);
  }, [filteredBroadcasters, chainId, tableState]);

  const writeSnapshot = () => {
    const targetDirectory = path.resolve(process.cwd(), screenshotDir);
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const filePath = path.join(targetDirectory, `broadcaster-snapshot-${timestamp}.csv`);

    try {
      fs.mkdirSync(targetDirectory, { recursive: true });
      fs.writeFileSync(
        filePath,
        createBroadcasterSnapshotCsv(processedBroadcasters, chainId) + '\n'
      );
      addAppLog(`Snapshot saved: ${filePath}`, 'success');
    } catch (error) {
      addAppLog(`Snapshot failed: ${(error as Error).message}`, 'error');
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (viewMode === 'peers' && peerFilterMode) {
        setPeerFilterMode(false);
      } else if (filterMode) {
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

    if (input === 'p') {
      setViewMode((current) => {
        const next = current === 'broadcasters' ? 'peers' : 'broadcasters';
        if (next === 'peers' && focus !== 'logs') {
          setFocus('peers');
          setFilterMode(false);
        }
        if (next === 'broadcasters' && focus === 'peers') {
          setFocus('table');
          setPeerFilterMode(false);
        }
        return next;
      });
      return;
    }

    if (viewMode === 'broadcasters' && focus === 'table' && !filterMode && input === 's') {
      writeSnapshot();
      return;
    }

    if (key.tab) {
      if (viewMode === 'peers') {
        if (key.shift) {
          if (focus === 'peers') setFocus('logs');
          else if (focus === 'logs') setFocus('peer-details');
          else setFocus('peers');
        } else {
          if (focus === 'peers') setFocus('peer-details');
          else if (focus === 'peer-details') setFocus('logs');
          else setFocus('peers');
        }
      } else {
        if (key.shift) {
          if (focus === 'table') setFocus('logs');
          else if (focus === 'logs') setFocus('address');
          else setFocus('table');
        } else {
          if (focus === 'table') setFocus('address');
          else if (focus === 'address') setFocus('logs');
          else setFocus('table');
        }
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
          View: {viewMode} | Peers: {status.peers} | Last Scan:{' '}
          {status.lastScan ? status.lastScan.toLocaleTimeString() : 'Pending'}
          {' | '}PX: {status.peerStatus.summary.peerExchangeCapableCount}
          {' | '}Direct: {status.peerStatus.summary.configuredDirectConnectedCount}/
          {status.peerStatus.summary.configuredDirectPeerCount}
          {' | '}Peer Mode: {peerTableState.mode}
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
      {viewMode === 'broadcasters' ? (
        <Box flexDirection="row" height={contentHeight}>
          <Box width={tableWidth} flexDirection="column">
            <BroadcasterTable
              broadcasters={filteredBroadcasters}
              chainId={chainId}
              isFocused={focus === 'table'}
              height={contentHeight}
              width={tableWidth}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              tableState={tableState}
              setTableState={setTableState}
              trustedFeeSigners={status.trustedFeeSigners}
            />
          </Box>

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
      ) : (
        <Box flexDirection="row" height={contentHeight}>
          <Box width={tableWidth} flexDirection="column">
            <PeerTable
              peerStatus={status.peerStatus}
              isFocused={focus === 'peers'}
              height={contentHeight}
              width={tableWidth}
              filterMode={peerFilterMode}
              setFilterMode={setPeerFilterMode}
              tableState={peerTableState}
              setTableState={setPeerTableState}
              onSelectedPeerChange={setSelectedPeer}
            />
          </Box>
          <Box width={addressWidth} flexDirection="column">
            <PeerDetails
              peer={selectedPeer}
              isFocused={focus === 'peer-details'}
              height={contentHeight}
              width={addressWidth}
            />
          </Box>
        </Box>
      )}

      {/* Bottom: Logs */}
      <Box height={10} width="100%">
        <LogPanel logs={logs} isFocused={focus === 'logs'} />
      </Box>
    </Box>
  );
};

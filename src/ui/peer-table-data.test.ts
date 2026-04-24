import { describe, expect, it } from 'vitest';
import { createPeerRows, processPeerRows, type PeerTableState } from './peer-table-data';
import { PeerStatusSnapshot } from '../types';

const snapshot: PeerStatusSnapshot = {
  runtime: { hasWaku: true, isStarted: true, useDNSDiscovery: true, dnsDiscoveryUrls: ['dns'] },
  routing: { contentTopics: [] },
  connections: { count: 2, peers: ['explicit-peer', 'discovered-peer'] },
  peerStore: {
    count: 3,
    bootstrapCount: 1,
    peerExchangeCount: 1,
    bootstrapPeers: ['explicit-peer'],
    peerExchangePeers: ['discovered-peer'],
  },
  connectedPeers: [
    {
      peerId: 'explicit-peer',
      protocols: ['/store'],
      tags: ['bootstrap'],
      capabilities: ['store'],
      supportsPeerExchange: false,
      source: 'configured-direct',
      isConfiguredDirectPeer: true,
      isConfiguredStorePeer: false,
    },
    {
      peerId: 'discovered-peer',
      protocols: ['/lightpush', '/vac/waku/peer-exchange/2.0.0-alpha1'],
      tags: ['peer-exchange'],
      capabilities: ['lightpush', 'peer-exchange'],
      supportsPeerExchange: true,
      source: 'peer-exchange',
      isConfiguredDirectPeer: false,
      isConfiguredStorePeer: false,
    },
  ],
  configuredPeers: [
    {
      peerId: 'explicit-peer',
      multiaddrs: ['/dns4/one/p2p/explicit-peer'],
      kinds: ['direct'],
      status: 'connected',
      supportsPeerExchange: false,
      capabilities: ['store'],
      tags: ['bootstrap'],
    },
    {
      peerId: 'missing-peer',
      multiaddrs: ['/dns4/two/p2p/missing-peer'],
      kinds: ['direct'],
      status: 'configured-not-observed',
      supportsPeerExchange: false,
      capabilities: [],
      tags: [],
    },
  ],
  summary: {
    connectedPeerCount: 2,
    peerExchangeCapableCount: 1,
    configuredDirectPeerCount: 2,
    configuredDirectConnectedCount: 1,
    configuredStorePeerCount: 0,
    configuredStoreConnectedCount: 0,
    configuredUnavailableCount: 1,
  },
};

describe('peer table data', () => {
  const defaultState: PeerTableState = {
    filterQuery: '',
    sortKey: 'state',
    sortDirection: 'asc',
    mode: 'all',
  };

  it('merges configured and connected peers into single rows', () => {
    const rows = createPeerRows(snapshot);

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.peerId === 'explicit-peer')?.role).toBe('explicit+discovered');
    expect(rows.find((row) => row.peerId === 'missing-peer')?.state).toBe('not-observed');
    expect(rows.find((row) => row.peerId === 'discovered-peer')?.role).toBe('discovered');
  });

  it('filters issue mode to explicit peers with connection problems', () => {
    const rows = processPeerRows(createPeerRows(snapshot), { ...defaultState, mode: 'issues' });

    expect(rows.map((row) => row.peerId)).toEqual(['missing-peer']);
  });

  it('filters by peer properties', () => {
    const rows = processPeerRows(createPeerRows(snapshot), {
      ...defaultState,
      filterQuery: 'peer-exchange',
    });

    expect(rows.map((row) => row.peerId)).toEqual(['discovered-peer']);
  });
});

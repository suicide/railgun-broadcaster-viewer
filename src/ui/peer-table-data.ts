import { ConnectedPeerSource, PeerStatusSnapshot } from '../types.js';

export type PeerTableMode = 'all' | 'explicit' | 'connected' | 'issues';

export type PeerSortKey = 'peer' | 'state' | 'role' | 'px' | 'caps';
export type PeerSortDirection = 'asc' | 'desc';

export interface PeerTableState {
  filterQuery: string;
  sortKey: PeerSortKey;
  sortDirection: PeerSortDirection;
  mode: PeerTableMode;
}

export interface PeerTableRow {
  peerId: string;
  state: 'connected' | 'known' | 'not-observed';
  role: 'explicit' | 'discovered' | 'explicit+discovered';
  source: ConnectedPeerSource | 'explicit';
  isExplicit: boolean;
  isConnected: boolean;
  isKnown: boolean;
  isStorePeer: boolean;
  isDirectPeer: boolean;
  supportsPeerExchange: boolean;
  capabilities: string[];
  tags: string[];
  protocols: string[];
  multiaddrs: string[];
}

export const DEFAULT_PEER_TABLE_STATE: PeerTableState = {
  filterQuery: '',
  sortKey: 'state',
  sortDirection: 'asc',
  mode: 'all',
};

const stateWeight = (state: PeerTableRow['state']): number => {
  switch (state) {
    case 'connected':
      return 0;
    case 'known':
      return 1;
    case 'not-observed':
      return 2;
  }
};

const roleWeight = (row: PeerTableRow): number => {
  if (row.role === 'explicit+discovered') return 0;
  if (row.role === 'explicit') return 1;
  return 2;
};

const normalizeSource = (source: ConnectedPeerSource | 'explicit'): PeerTableRow['role'] => {
  if (source === 'configured-direct' || source === 'configured-store' || source === 'explicit') {
    return 'explicit';
  }
  if (source === 'configured-direct+store') {
    return 'explicit';
  }
  return 'discovered';
};

export const createPeerRows = (peerStatus: PeerStatusSnapshot): PeerTableRow[] => {
  const rows = new Map<string, PeerTableRow>();

  for (const peer of peerStatus.configuredPeers) {
    rows.set(peer.peerId, {
      peerId: peer.peerId,
      state:
        peer.status === 'connected'
          ? 'connected'
          : peer.status === 'known-not-connected'
            ? 'known'
            : 'not-observed',
      role: 'explicit',
      source: 'explicit',
      isExplicit: true,
      isConnected: peer.status === 'connected',
      isKnown: peer.status !== 'configured-not-observed',
      isStorePeer: peer.kinds.includes('store'),
      isDirectPeer: peer.kinds.includes('direct'),
      supportsPeerExchange: peer.supportsPeerExchange,
      capabilities: [...peer.capabilities],
      tags: [...peer.tags],
      protocols: [],
      multiaddrs: [...peer.multiaddrs],
    });
  }

  for (const peer of peerStatus.connectedPeers) {
    const existing = rows.get(peer.peerId);
    const role = normalizeSource(peer.source);
    rows.set(peer.peerId, {
      peerId: peer.peerId,
      state: 'connected',
      role: existing ? 'explicit+discovered' : role,
      source: peer.source,
      isExplicit:
        (existing?.isExplicit ?? peer.isConfiguredDirectPeer) || peer.isConfiguredStorePeer,
      isConnected: true,
      isKnown: true,
      isStorePeer: (existing?.isStorePeer ?? false) || peer.isConfiguredStorePeer,
      isDirectPeer: (existing?.isDirectPeer ?? false) || peer.isConfiguredDirectPeer,
      supportsPeerExchange: peer.supportsPeerExchange,
      capabilities: [...peer.capabilities],
      tags: [...peer.tags],
      protocols: [...peer.protocols],
      multiaddrs: existing?.multiaddrs ?? [],
    });
  }

  return [...rows.values()];
};

export const processPeerRows = (
  rows: PeerTableRow[],
  tableState: PeerTableState
): PeerTableRow[] => {
  const { filterQuery, mode, sortKey, sortDirection } = tableState;
  const normalizedQuery = filterQuery.trim().toLowerCase();

  const modeFiltered = rows.filter((row) => {
    switch (mode) {
      case 'all':
        return true;
      case 'explicit':
        return row.isExplicit;
      case 'connected':
        return row.isConnected;
      case 'issues':
        return row.isExplicit && !row.isConnected;
    }
  });

  const filtered = normalizedQuery
    ? modeFiltered.filter((row) => {
        const haystack = [
          row.peerId,
          row.state,
          row.role,
          row.source,
          row.capabilities.join(' '),
          row.tags.join(' '),
          row.protocols.join(' '),
          row.multiaddrs.join(' '),
          row.isStorePeer ? 'store' : '',
          row.isDirectPeer ? 'direct' : '',
          row.isExplicit ? 'explicit' : '',
          row.isConnected ? 'connected' : '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
    : [...modeFiltered];

  return filtered.sort((a, b) => {
    let valA: number | string = '';
    let valB: number | string = '';

    switch (sortKey) {
      case 'peer':
        valA = a.peerId;
        valB = b.peerId;
        break;
      case 'state':
        valA = stateWeight(a.state) * 10 + roleWeight(a);
        valB = stateWeight(b.state) * 10 + roleWeight(b);
        break;
      case 'role':
        valA = roleWeight(a);
        valB = roleWeight(b);
        break;
      case 'px':
        valA = a.supportsPeerExchange ? 0 : 1;
        valB = b.supportsPeerExchange ? 0 : 1;
        break;
      case 'caps':
        valA = `${a.capabilities.length}`.padStart(3, '0') + a.capabilities.join(',');
        valB = `${b.capabilities.length}`.padStart(3, '0') + b.capabilities.join(',');
        break;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return a.peerId.localeCompare(b.peerId);
  });
};

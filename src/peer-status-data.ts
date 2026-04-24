import {
  AppConfig,
  ConfiguredPeerKind,
  ConfiguredPeerStatus,
  ConfiguredPeerStatusType,
  ConnectedPeerSource,
  ConnectedPeerStatus,
  PeerCapability,
  PeerStatusSnapshot,
} from './types.js';
import { COMBINED_EXTENDED_STATIC_NODES } from './static-nodes.js';

const DEFAULT_NODE_DNS_DISCOVERY_URL =
  'enrtree://APMYHUVNQWHJNPI5L2KQ765EMCKUAMRWPUH3U2QIKPK6XEV3OW442@discovery.rootedinprivacy.com';

type PeerStoreEntry = {
  id?: { toString?: () => string } | string;
  protocols?: string[];
  tags?: Map<string, unknown> | { keys?: () => IterableIterator<string> };
};

type WakuLike = {
  isStarted?: () => boolean;
  libp2p?: {
    getConnections?: () => Array<{ remotePeer?: { toString?: () => string } | string }>;
    peerStore?: {
      all?: () => Promise<PeerStoreEntry[]>;
    };
    services?: {
      filter?: unknown;
      store?: unknown;
      lightpush?: unknown;
      relay?: unknown;
    };
    getProtocols?: () => string[];
  };
  filter?: unknown;
  store?: unknown;
  lightPush?: unknown;
  relay?: unknown;
};

const PEER_EXCHANGE_PROTOCOL = '/vac/waku/peer-exchange/2.0.0-alpha1';

const extractPeerIdFromMultiaddr = (multiaddr: string): string | undefined => {
  return multiaddr.match(/\/p2p\/([^/]+)$/)?.[1];
};

const getPeerId = (peerIdLike: { toString?: () => string } | string | undefined): string => {
  if (typeof peerIdLike === 'string') {
    return peerIdLike;
  }

  return peerIdLike?.toString?.() ?? 'unknown-peer';
};

const getTagNames = (tags: PeerStoreEntry['tags']): string[] => {
  if (!tags) {
    return [];
  }

  if (tags instanceof Map) {
    return Array.from(tags.keys()).sort();
  }

  if (typeof tags.keys === 'function') {
    return Array.from(tags.keys()).sort();
  }

  return [];
};

const deriveCapabilities = (protocols: string[]): PeerCapability[] => {
  const joined = protocols.join(' ').toLowerCase();
  const capabilities: PeerCapability[] = [];

  if (joined.includes('relay')) {
    capabilities.push('relay');
  }
  if (joined.includes('store')) {
    capabilities.push('store');
  }
  if (joined.includes('filter')) {
    capabilities.push('filter');
  }
  if (joined.includes('lightpush')) {
    capabilities.push('lightpush');
  }
  if (protocols.includes(PEER_EXCHANGE_PROTOCOL) || joined.includes('peer-exchange')) {
    capabilities.push('peer-exchange');
  }

  return capabilities;
};

const getConfiguredDirectMultiaddrs = (config: AppConfig): string[] => {
  return config.extendedStaticNodes ? [...COMBINED_EXTENDED_STATIC_NODES] : [];
};

const getConfiguredStoreMultiaddrs = (_config: AppConfig): string[] => {
  return [];
};

const getDnsDiscoveryUrls = (): string[] => {
  return [DEFAULT_NODE_DNS_DISCOVERY_URL];
};

const buildConfiguredPeerEntries = (
  directMultiaddrs: string[],
  storeMultiaddrs: string[]
): Map<string, { peerId: string; multiaddrs: Set<string>; kinds: Set<ConfiguredPeerKind> }> => {
  const entries = new Map<
    string,
    { peerId: string; multiaddrs: Set<string>; kinds: Set<ConfiguredPeerKind> }
  >();

  const addEntry = (multiaddr: string, kind: ConfiguredPeerKind) => {
    const peerId = extractPeerIdFromMultiaddr(multiaddr);
    if (!peerId) {
      return;
    }

    const current = entries.get(peerId) ?? {
      peerId,
      multiaddrs: new Set<string>(),
      kinds: new Set<ConfiguredPeerKind>(),
    };
    current.multiaddrs.add(multiaddr);
    current.kinds.add(kind);
    entries.set(peerId, current);
  };

  directMultiaddrs.forEach((multiaddr) => addEntry(multiaddr, 'direct'));
  storeMultiaddrs.forEach((multiaddr) => addEntry(multiaddr, 'store'));

  return entries;
};

const classifyConnectedPeerSource = (
  peerId: string,
  tags: string[],
  configuredKinds: Set<ConfiguredPeerKind>
): ConnectedPeerSource => {
  const isDirect = configuredKinds.has('direct');
  const isStore = configuredKinds.has('store');

  if (isDirect && isStore) {
    return 'configured-direct+store';
  }

  if (isDirect) {
    return 'configured-direct';
  }

  if (isStore) {
    return 'configured-store';
  }

  if (tags.includes('peer-exchange')) {
    return 'peer-exchange';
  }

  return peerId === 'unknown-peer' ? 'discovered' : 'discovered';
};

export const createEmptyPeerStatusSnapshot = (config: AppConfig): PeerStatusSnapshot => {
  const directMultiaddrs = getConfiguredDirectMultiaddrs(config);
  const storeMultiaddrs = getConfiguredStoreMultiaddrs(config);
  const configuredEntries = buildConfiguredPeerEntries(directMultiaddrs, storeMultiaddrs);
  const configuredPeers = [...configuredEntries.values()]
    .map<ConfiguredPeerStatus>((entry) => ({
      peerId: entry.peerId,
      multiaddrs: [...entry.multiaddrs].sort(),
      kinds: [...entry.kinds].sort(),
      status: 'configured-not-observed',
      supportsPeerExchange: false,
      capabilities: [],
      tags: [],
    }))
    .sort((a, b) => a.peerId.localeCompare(b.peerId));

  const configuredDirectPeerCount = configuredPeers.filter((peer) =>
    peer.kinds.includes('direct')
  ).length;
  const configuredStorePeerCount = configuredPeers.filter((peer) =>
    peer.kinds.includes('store')
  ).length;

  return {
    runtime: {
      hasWaku: false,
      isStarted: false,
      useDNSDiscovery: true,
      dnsDiscoveryUrls: getDnsDiscoveryUrls(),
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
    configuredPeers,
    summary: {
      connectedPeerCount: 0,
      peerExchangeCapableCount: 0,
      configuredDirectPeerCount,
      configuredDirectConnectedCount: 0,
      configuredStorePeerCount,
      configuredStoreConnectedCount: 0,
      configuredUnavailableCount: configuredPeers.length,
    },
  };
};

export const derivePeerStatusSnapshot = async (
  config: AppConfig,
  waku: WakuLike | undefined,
  options?: {
    clusterId?: number;
    shardId?: number;
    pubSubTopic?: string;
    contentTopics?: string[];
  }
): Promise<PeerStatusSnapshot> => {
  const directMultiaddrs = getConfiguredDirectMultiaddrs(config);
  const storeMultiaddrs = getConfiguredStoreMultiaddrs(config);
  const configuredEntries = buildConfiguredPeerEntries(directMultiaddrs, storeMultiaddrs);
  const connections = waku?.libp2p?.getConnections?.() ?? [];
  const connectionPeerIds = connections.map((connection) => getPeerId(connection.remotePeer));
  const connectedPeerIdSet = new Set(connectionPeerIds);

  const peerStoreEntries = (await waku?.libp2p?.peerStore?.all?.().catch(() => [])) ?? [];
  const peerStoreById = new Map<string, PeerStoreEntry>();
  const bootstrapPeers: string[] = [];
  const peerExchangePeers: string[] = [];

  for (const peer of peerStoreEntries) {
    const peerId = getPeerId(peer.id);
    peerStoreById.set(peerId, peer);
    const tags = getTagNames(peer.tags);
    if (tags.includes('bootstrap')) {
      bootstrapPeers.push(peerId);
    }
    if (tags.includes('peer-exchange')) {
      peerExchangePeers.push(peerId);
    }
  }

  const connectedPeers = [...new Set(connectionPeerIds)]
    .map<ConnectedPeerStatus>((peerId) => {
      const peerStoreEntry = peerStoreById.get(peerId);
      const protocols = [...(peerStoreEntry?.protocols ?? [])].sort();
      const tags = getTagNames(peerStoreEntry?.tags);
      const capabilities = deriveCapabilities(protocols);
      const configuredKinds = configuredEntries.get(peerId)?.kinds ?? new Set<ConfiguredPeerKind>();
      return {
        peerId,
        protocols,
        tags,
        capabilities,
        supportsPeerExchange: capabilities.includes('peer-exchange'),
        source: classifyConnectedPeerSource(peerId, tags, configuredKinds),
        isConfiguredDirectPeer: configuredKinds.has('direct'),
        isConfiguredStorePeer: configuredKinds.has('store'),
      };
    })
    .sort((a, b) => a.peerId.localeCompare(b.peerId));

  const connectedPeerMap = new Map(connectedPeers.map((peer) => [peer.peerId, peer]));
  const configuredPeers = [...configuredEntries.values()]
    .map<ConfiguredPeerStatus>((entry) => {
      const peerStoreEntry = peerStoreById.get(entry.peerId);
      const connectedPeer = connectedPeerMap.get(entry.peerId);
      const tags = connectedPeer?.tags ?? getTagNames(peerStoreEntry?.tags);
      const protocols = connectedPeer?.protocols ?? [...(peerStoreEntry?.protocols ?? [])].sort();
      const capabilities = deriveCapabilities(protocols);

      let status: ConfiguredPeerStatusType = 'configured-not-observed';
      if (connectedPeerIdSet.has(entry.peerId)) {
        status = 'connected';
      } else if (peerStoreById.has(entry.peerId)) {
        status = 'known-not-connected';
      }

      return {
        peerId: entry.peerId,
        multiaddrs: [...entry.multiaddrs].sort(),
        kinds: [...entry.kinds].sort(),
        status,
        supportsPeerExchange: capabilities.includes('peer-exchange'),
        capabilities,
        tags,
      };
    })
    .sort((a, b) => {
      const statusOrder: Record<ConfiguredPeerStatusType, number> = {
        connected: 0,
        'known-not-connected': 1,
        'configured-not-observed': 2,
      };
      return statusOrder[a.status] - statusOrder[b.status] || a.peerId.localeCompare(b.peerId);
    });

  const configuredDirectPeerCount = configuredPeers.filter((peer) =>
    peer.kinds.includes('direct')
  ).length;
  const configuredDirectConnectedCount = configuredPeers.filter(
    (peer) => peer.kinds.includes('direct') && peer.status === 'connected'
  ).length;
  const configuredStorePeerCount = configuredPeers.filter((peer) =>
    peer.kinds.includes('store')
  ).length;
  const configuredStoreConnectedCount = configuredPeers.filter(
    (peer) => peer.kinds.includes('store') && peer.status === 'connected'
  ).length;

  return {
    runtime: {
      hasWaku: Boolean(waku),
      isStarted: waku?.isStarted?.() ?? false,
      useDNSDiscovery: true,
      dnsDiscoveryUrls: getDnsDiscoveryUrls(),
    },
    routing: {
      clusterId: options?.clusterId,
      shardId: options?.shardId,
      pubSubTopic: options?.pubSubTopic,
      contentTopics: [...(options?.contentTopics ?? [])].sort(),
    },
    connections: {
      count: connections.length,
      peers: [...new Set(connectionPeerIds)].sort(),
    },
    peerStore: {
      count: peerStoreEntries.length,
      bootstrapCount: bootstrapPeers.length,
      peerExchangeCount: peerExchangePeers.length,
      bootstrapPeers: [...new Set(bootstrapPeers)].sort(),
      peerExchangePeers: [...new Set(peerExchangePeers)].sort(),
    },
    connectedPeers,
    configuredPeers,
    summary: {
      connectedPeerCount: connectedPeers.length,
      peerExchangeCapableCount: connectedPeers.filter((peer) => peer.supportsPeerExchange).length,
      configuredDirectPeerCount,
      configuredDirectConnectedCount,
      configuredStorePeerCount,
      configuredStoreConnectedCount,
      configuredUnavailableCount: configuredPeers.filter((peer) => peer.status !== 'connected')
        .length,
    },
  };
};

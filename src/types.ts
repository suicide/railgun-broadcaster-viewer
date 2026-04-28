export interface AppConfig {
  chainType: number;
  chainId: number;
  /**
   * Security setting establishing a "source of truth" for Relayer fees.
   * Protects against price gouging by enforcing strict fee variance (-10% to +30%).
   * The client waits for a broadcast from this signer to establish a baseline.
   */
  trustedFeeSigner?: string[];
  extendedStaticNodes?: boolean;
  pubSubTopic?: string;
  refreshInterval: number;
  tokenAddress?: string; // Optional token to query for specific fees
  filterNative?: boolean;
  debug?: boolean;
  fileLogging?: boolean;
  traceFees?: boolean;
  traceFeesFile?: string;
  screenshotDir?: string;
}

export interface BroadcasterInfo {
  railgunAddress: string;
  feePerUnitGas: string;
  // Add other fields as we discover what the SDK returns
}

export type PeerCapability = 'relay' | 'store' | 'filter' | 'lightpush' | 'peer-exchange';

export type ConnectedPeerSource =
  | 'configured-direct'
  | 'configured-store'
  | 'configured-direct+store'
  | 'peer-exchange'
  | 'discovered';

export type ConfiguredPeerKind = 'direct' | 'store';

export type ConfiguredPeerStatusType =
  | 'connected'
  | 'known-not-connected'
  | 'configured-not-observed';

export interface ConnectedPeerStatus {
  peerId: string;
  protocols: string[];
  tags: string[];
  capabilities: PeerCapability[];
  supportsPeerExchange: boolean;
  source: ConnectedPeerSource;
  isConfiguredDirectPeer: boolean;
  isConfiguredStorePeer: boolean;
}

export interface ConfiguredPeerStatus {
  peerId: string;
  multiaddrs: string[];
  kinds: ConfiguredPeerKind[];
  status: ConfiguredPeerStatusType;
  supportsPeerExchange: boolean;
  capabilities: PeerCapability[];
  tags: string[];
}

export interface PeerStatusSnapshot {
  runtime: {
    hasWaku: boolean;
    isStarted: boolean;
    useDNSDiscovery: boolean;
    dnsDiscoveryUrls: string[];
  };
  routing: {
    clusterId?: number;
    shardId?: number;
    pubSubTopic?: string;
    contentTopics: string[];
  };
  connections: {
    count: number;
    peers: string[];
  };
  peerStore: {
    count: number;
    bootstrapCount: number;
    peerExchangeCount: number;
    bootstrapPeers: string[];
    peerExchangePeers: string[];
  };
  connectedPeers: ConnectedPeerStatus[];
  configuredPeers: ConfiguredPeerStatus[];
  summary: {
    connectedPeerCount: number;
    peerExchangeCapableCount: number;
    configuredDirectPeerCount: number;
    configuredDirectConnectedCount: number;
    configuredStorePeerCount: number;
    configuredStoreConnectedCount: number;
    configuredUnavailableCount: number;
  };
}

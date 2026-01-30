export interface AppConfig {
  chainType: number;
  chainId: number;
  /**
   * Security setting establishing a "source of truth" for Relayer fees.
   * Protects against price gouging by enforcing strict fee variance (-10% to +30%).
   * The client waits for a broadcast from this signer to establish a baseline.
   */
  trustedFeeSigner?: string;
  pubSubTopic?: string;
  refreshInterval: number;
  tokenAddress?: string; // Optional token to query for specific fees
  debug?: boolean;
  fileLogging?: boolean;
}

export interface BroadcasterInfo {
  railgunAddress: string;
  feePerUnitGas: string;
  // Add other fields as we discover what the SDK returns
}

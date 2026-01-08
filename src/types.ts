export interface AppConfig {
  chainType: number;
  chainId: number;
  trustedFeeSigner: string;
  refreshInterval: number;
  tokenAddress?: string; // Optional token to query for specific fees
}

export interface BroadcasterInfo {
  railgunAddress: string;
  feePerUnitGas: string;
  // Add other fields as we discover what the SDK returns
}

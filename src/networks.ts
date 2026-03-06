export const NETWORK_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon PoS',
  80001: 'Mumbai Testnet',
  42161: 'Arbitrum One',
  421613: 'Arbitrum Goerli',
  56: 'BNB Chain',
  97: 'BNB Testnet',
  10: 'Optimism',
  420: 'Optimism Goerli',
};

export const getNetworkName = (chainId: number): string => {
  return NETWORK_NAMES[chainId] || 'Unknown Chain';
};

type TokenInfo = {
  symbol: string;
  decimals: number;
  isNative?: boolean;
};

// Map: ChainID -> Lowercase Address -> TokenInfo
const TOKENS: Record<number, Record<string, TokenInfo>> = {
  // Ethereum (Chain ID 1)
  1: {
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18, isNative: true },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18 },
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
    '0xe76c6c83af64e4c60245d8c7de953df673a7a33d': { symbol: 'RAIL', decimals: 18 },
  },

  // BSC (Chain ID 56)
  56: {
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': { symbol: 'WBNB', decimals: 18, isNative: true },
    '0xe9e7cea3dedca5984780bafc599bd69add087d56': { symbol: 'BUSD', decimals: 18 },
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': { symbol: 'DAI', decimals: 18 },
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': { symbol: 'CAKE', decimals: 18 },
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18 }, // Binance-Peg USDC
    '0x55d398326f99059ff775485246999027b3197955': { symbol: 'USDT', decimals: 18 }, // Binance-Peg USDT
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8': { symbol: 'ETH', decimals: 18 },
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': { symbol: 'BTCB', decimals: 18 },
    '0x3f847b01d4d498a293e3197b186356039ecd737f': { symbol: 'RAILBSC', decimals: 18 },
  },

  // Polygon (Chain ID 137)
  137: {
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': {
      symbol: 'WMATIC',
      decimals: 18,
      isNative: true,
    },
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': { symbol: 'DAI', decimals: 18 },
    '0xa649325aa7c5093d12d6f98eb4378deae68ce23f': { symbol: 'BNB', decimals: 18 },
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { symbol: 'WETH', decimals: 18 },
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { symbol: 'USDCe', decimals: 6 },
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6 },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', decimals: 6 },
    '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': { symbol: 'WBTC', decimals: 8 },
    '0x92a9c92c215092720c731c96d4ff508c831a714f': { symbol: 'RAILPOLY', decimals: 18 },
  },

  // Arbitrum (Chain ID 42161)
  42161: {
    '0x912ce59144191c1204e64559fe8253a0e49e6548': { symbol: 'ARB', decimals: 18 },
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6 },
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': { symbol: 'USDCe', decimals: 6 },
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6 },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { symbol: 'DAI', decimals: 18 },
    '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0': { symbol: 'UNI', decimals: 18 },
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': { symbol: 'WBTC', decimals: 8 },
    '0x4d15a3a2286d883af0aa1b3f21367843fac63e07': { symbol: 'TUSD', decimals: 18 },
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', decimals: 18, isNative: true },
  },

  // Sepolia Testnet (Chain ID 11155111)
  11155111: {
    '0xfff9976782d46cc05630d1f6ebab18b2324d6b14': { symbol: 'WETH', decimals: 18, isNative: true },
  },
};

export function getTokenName(chainId: number, address: string): string | undefined {
  const normalizedAddress = address.toLowerCase();
  return TOKENS[chainId]?.[normalizedAddress]?.symbol;
}

export function isChainNativeToken(chainId: number, address: string): boolean {
  const normalizedAddress = address.toLowerCase();
  return TOKENS[chainId]?.[normalizedAddress]?.isNative ?? false;
}

export function getTokenDecimals(chainId: number, address: string): number {
  const normalizedAddress = address.toLowerCase();
  return TOKENS[chainId]?.[normalizedAddress]?.decimals ?? 18;
}

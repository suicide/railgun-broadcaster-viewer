import { describe, it, expect } from 'vitest';
import { getTokenName, isChainNativeToken, getTokenDecimals } from './tokens';

describe('tokens', () => {
  describe('getTokenName', () => {
    it('should return the correct symbol for a known token', () => {
      // Ethereum USDT
      expect(getTokenName(1, '0xdac17f958d2ee523a2206206994597c13d831ec7')).toBe('USDT');
      // Polygon WMATIC
      expect(getTokenName(137, '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270')).toBe('WMATIC');
    });

    it('should handle uppercase addresses', () => {
      expect(getTokenName(1, '0xdac17f958d2ee523a2206206994597c13d831ec7'.toUpperCase())).toBe(
        'USDT'
      );
    });

    it('should return undefined for an unknown token', () => {
      expect(getTokenName(1, '0x0000000000000000000000000000000000000000')).toBeUndefined();
    });

    it('should return undefined for an unknown chain', () => {
      expect(getTokenName(999, '0xdac17f958d2ee523a2206206994597c13d831ec7')).toBeUndefined();
    });
  });

  describe('isChainNativeToken', () => {
    it('should return true for native tokens', () => {
      // Ethereum WETH
      expect(isChainNativeToken(1, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')).toBe(true);
      // BSC WBNB
      expect(isChainNativeToken(56, '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c')).toBe(true);
    });

    it('should return false for non-native tokens', () => {
      // Ethereum USDT
      expect(isChainNativeToken(1, '0xdac17f958d2ee523a2206206994597c13d831ec7')).toBe(false);
    });

    it('should return false for unknown tokens', () => {
      expect(isChainNativeToken(1, '0x0000000000000000000000000000000000000000')).toBe(false);
    });
  });

  describe('getTokenDecimals', () => {
    it('should return the correct decimals for known tokens', () => {
      // Ethereum USDT (6 decimals)
      expect(getTokenDecimals(1, '0xdac17f958d2ee523a2206206994597c13d831ec7')).toBe(6);
      // Ethereum DAI (18 decimals)
      expect(getTokenDecimals(1, '0x6b175474e89094c44da98b954eedeac495271d0f')).toBe(18);
    });

    it('should default to 18 decimals for unknown tokens', () => {
      expect(getTokenDecimals(1, '0x0000000000000000000000000000000000000000')).toBe(18);
    });
  });
});

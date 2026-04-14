import { describe, expect, it } from 'vitest';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import {
  createBroadcasterSnapshotCsv,
  processBroadcasters,
  type BroadcasterTableState,
} from './broadcaster-table-data';

function createBroadcaster(
  railgunAddress: string,
  tokenAddress: string,
  overrides?: Partial<SelectedBroadcaster['tokenFee']>
): SelectedBroadcaster {
  return {
    railgunAddress,
    tokenAddress,
    tokenFee: {
      feePerUnitGas: '1000000',
      expiration: 1700000000000,
      reliability: 0.9,
      availableWallets: 3,
      relayAdapt: 'adapt://default',
      ...overrides,
    },
  } as SelectedBroadcaster;
}

describe('broadcaster table data', () => {
  const chainId = 1;
  const byFeeAsc: BroadcasterTableState = {
    filterQuery: '',
    sortKey: 'fee',
    sortDirection: 'asc',
  };

  it('filters by token name and preserves sorted order', () => {
    const broadcasters = [
      createBroadcaster('zk1-high-fee-address', '0xdac17f958d2ee523a2206206994597c13d831ec7', {
        feePerUnitGas: '2000000',
      }),
      createBroadcaster('zk1-low-fee-address', '0xdac17f958d2ee523a2206206994597c13d831ec7', {
        feePerUnitGas: '1000000',
      }),
      createBroadcaster('zk1-other-token-address', '0x6b175474e89094c44da98b954eedeac495271d0f', {
        feePerUnitGas: '500000',
      }),
    ];

    const processed = processBroadcasters(broadcasters, chainId, {
      ...byFeeAsc,
      filterQuery: 'usdt',
    });

    expect(processed.map((b) => b.railgunAddress)).toEqual([
      'zk1-low-fee-address',
      'zk1-high-fee-address',
    ]);
  });

  it('does not mutate the original broadcaster array while sorting', () => {
    const broadcasters = [
      createBroadcaster('zk1-b-address', '0xdac17f958d2ee523a2206206994597c13d831ec7'),
      createBroadcaster('zk1-a-address', '0x6b175474e89094c44da98b954eedeac495271d0f'),
    ];

    const originalOrder = broadcasters.map((b) => b.railgunAddress);
    const processed = processBroadcasters(broadcasters, chainId, {
      filterQuery: '',
      sortKey: 'address',
      sortDirection: 'asc',
    });

    expect(processed.map((b) => b.railgunAddress)).toEqual(['zk1-a-address', 'zk1-b-address']);
    expect(broadcasters.map((b) => b.railgunAddress)).toEqual(originalOrder);
  });

  it('creates a csv snapshot with full addresses and escaped values', () => {
    const broadcaster = createBroadcaster(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
      {
        feePerUnitGas: '1000',
        expiration: Date.UTC(2026, 0, 2, 3, 4, 5),
        reliability: 0.975,
        availableWallets: 7,
        relayAdapt: 'waku://peer,quoted',
      }
    );

    const csv = createBroadcasterSnapshotCsv([broadcaster], chainId);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'railgunAddress,tokenAddress,tokenName,feePerUnitGas,feeDisplay,expiration,reliability,availableWallets,relayAdapt'
    );
    expect(lines[1]).toContain(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    );
    expect(lines[1]).toContain('USDT');
    expect(lines[1]).toContain('2026-01-02T03:04:05.000Z');
    expect(lines[1]).toContain('"waku://peer,quoted"');
  });
});

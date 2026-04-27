import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { formatUnits } from 'ethers';
import { RAILWAY_SIGNERS, TERMINAL_SIGNERS } from '../signers.js';
import { getTokenDecimals, getTokenName, isChainNativeToken } from '../tokens.js';

export type SortKey =
  | 'address'
  | 'token'
  | 'fee'
  | 'expiration'
  | 'reliability'
  | 'wallets'
  | 'adapt';

export type SortDirection = 'asc' | 'desc';

export interface BroadcasterTableState {
  filterQuery: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

export const DEFAULT_BROADCASTER_TABLE_STATE: BroadcasterTableState = {
  filterQuery: '',
  sortKey: 'fee',
  sortDirection: 'asc',
};

const COMMUNITY_TRUSTED_SIGNERS = new Set(
  [...RAILWAY_SIGNERS, ...TERMINAL_SIGNERS].map((address) => address.toLowerCase())
);

function getBroadcasterFeeValue(broadcaster: SelectedBroadcaster): bigint | undefined {
  try {
    return BigInt(broadcaster.tokenFee.feePerUnitGas ?? 0);
  } catch {
    return undefined;
  }
}

export function buildOutOfBoundsBroadcasterSet(
  broadcasters: SelectedBroadcaster[]
): ReadonlySet<SelectedBroadcaster> {
  const outOfBounds = new Set<SelectedBroadcaster>();
  const broadcastersByToken = new Map<string, SelectedBroadcaster[]>();

  broadcasters.forEach((broadcaster) => {
    const tokenKey = broadcaster.tokenAddress.toLowerCase();
    const tokenBroadcasters = broadcastersByToken.get(tokenKey);
    if (tokenBroadcasters) {
      tokenBroadcasters.push(broadcaster);
    } else {
      broadcastersByToken.set(tokenKey, [broadcaster]);
    }
  });

  broadcastersByToken.forEach((tokenBroadcasters) => {
    const trustedQuotes = tokenBroadcasters.filter((broadcaster) =>
      COMMUNITY_TRUSTED_SIGNERS.has(broadcaster.railgunAddress.toLowerCase())
    );

    if (trustedQuotes.length === 0) {
      return;
    }

    let totalTrustedFee = 0n;
    let validTrustedQuoteCount = 0n;

    trustedQuotes.forEach((broadcaster) => {
      const feeValue = getBroadcasterFeeValue(broadcaster);
      if (feeValue === undefined) {
        return;
      }

      totalTrustedFee += feeValue;
      validTrustedQuoteCount += 1n;
    });

    if (validTrustedQuoteCount === 0n) {
      return;
    }

    const averageTrustedFee = totalTrustedFee / validTrustedQuoteCount;
    const varianceLower = (averageTrustedFee * 10n) / 100n;
    const varianceUpper = (averageTrustedFee * 30n) / 100n;
    const minFee = averageTrustedFee - varianceLower;
    const maxFee = averageTrustedFee + varianceUpper;

    tokenBroadcasters.forEach((broadcaster) => {
      if (COMMUNITY_TRUSTED_SIGNERS.has(broadcaster.railgunAddress.toLowerCase())) {
        return;
      }

      const feeValue = getBroadcasterFeeValue(broadcaster);
      if (feeValue === undefined) {
        return;
      }

      if (feeValue < minFee || feeValue > maxFee) {
        outOfBounds.add(broadcaster);
      }
    });
  });

  return outOfBounds;
}

export function processBroadcasters(
  broadcasters: SelectedBroadcaster[],
  chainId: number,
  tableState: BroadcasterTableState
): SelectedBroadcaster[] {
  const { filterQuery, sortKey, sortDirection } = tableState;
  const normalizedQuery = filterQuery.trim().toLowerCase();

  const filtered = normalizedQuery
    ? broadcasters.filter(
        (b) =>
          b.railgunAddress.toLowerCase().includes(normalizedQuery) ||
          b.tokenAddress.toLowerCase().includes(normalizedQuery) ||
          (getTokenName(chainId, b.tokenAddress) || '').toLowerCase().includes(normalizedQuery)
      )
    : [...broadcasters];

  return filtered.sort((a, b) => {
    let valA: bigint | number | string = '';
    let valB: bigint | number | string = '';

    switch (sortKey) {
      case 'address':
        valA = a.railgunAddress;
        valB = b.railgunAddress;
        break;
      case 'token':
        valA = getTokenName(chainId, a.tokenAddress) || a.tokenAddress;
        valB = getTokenName(chainId, b.tokenAddress) || b.tokenAddress;
        break;
      case 'fee':
        try {
          valA = BigInt(a.tokenFee.feePerUnitGas ?? 0);
        } catch {
          valA = BigInt(0);
        }
        try {
          valB = BigInt(b.tokenFee.feePerUnitGas ?? 0);
        } catch {
          valB = BigInt(0);
        }
        break;
      case 'expiration':
        valA = a.tokenFee.expiration;
        valB = b.tokenFee.expiration;
        break;
      case 'reliability':
        valA = a.tokenFee.reliability;
        valB = b.tokenFee.reliability;
        break;
      case 'wallets':
        valA = a.tokenFee.availableWallets;
        valB = b.tokenFee.availableWallets;
        break;
      case 'adapt':
        valA = a.tokenFee.relayAdapt;
        valB = b.tokenFee.relayAdapt;
        break;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

export function formatBroadcasterFee(broadcaster: SelectedBroadcaster, chainId: number): string {
  const tokenName = getTokenName(chainId, broadcaster.tokenAddress);
  const decimals = getTokenDecimals(chainId, broadcaster.tokenAddress);
  const feeRaw = broadcaster.tokenFee.feePerUnitGas;

  if (isChainNativeToken(chainId, broadcaster.tokenAddress)) {
    const feeGwei = parseFloat(formatUnits(feeRaw, 9));
    return `${feeGwei.toFixed(2)} Gwei`;
  }

  const value = parseFloat(formatUnits(feeRaw, decimals));
  let valueString = '';

  if (value === 0) {
    valueString = '0';
  } else if (value < 0.0001) {
    valueString = value.toExponential(2);
  } else {
    valueString = value.toFixed(6).replace(/\.?0+$/, '');
  }

  return `${valueString}${tokenName ? ` ${tokenName}` : ''}`;
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function createBroadcasterSnapshotCsv(
  broadcasters: SelectedBroadcaster[],
  chainId: number
): string {
  const headers = [
    'railgunAddress',
    'tokenAddress',
    'tokenName',
    'feePerUnitGas',
    'feeDisplay',
    'expiration',
    'reliability',
    'availableWallets',
    'relayAdapt',
  ];

  const rows = broadcasters.map((broadcaster) => {
    const tokenName = getTokenName(chainId, broadcaster.tokenAddress) || '';

    return [
      broadcaster.railgunAddress,
      broadcaster.tokenAddress,
      tokenName,
      broadcaster.tokenFee.feePerUnitGas,
      formatBroadcasterFee(broadcaster, chainId),
      new Date(broadcaster.tokenFee.expiration).toISOString(),
      broadcaster.tokenFee.reliability,
      broadcaster.tokenFee.availableWallets,
      broadcaster.tokenFee.relayAdapt,
    ]
      .map(escapeCsvValue)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

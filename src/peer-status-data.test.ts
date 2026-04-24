import { describe, expect, it } from 'vitest';
import { createEmptyPeerStatusSnapshot, derivePeerStatusSnapshot } from './peer-status-data';
import { AppConfig } from './types';

const baseConfig: AppConfig = {
  chainType: 0,
  chainId: 1,
  refreshInterval: 30000,
  extendedStaticNodes: true,
};

describe('peer status data', () => {
  it('marks configured peers as unavailable when waku is absent', () => {
    const snapshot = createEmptyPeerStatusSnapshot(baseConfig);

    expect(snapshot.runtime.hasWaku).toBe(false);
    expect(snapshot.configuredPeers.length).toBe(5);
    expect(snapshot.summary.configuredDirectPeerCount).toBe(5);
    expect(snapshot.summary.configuredUnavailableCount).toBe(5);
    expect(
      snapshot.configuredPeers.every((peer) => peer.status === 'configured-not-observed')
    ).toBe(true);
  });

  it('derives connected and known configured peer states from libp2p data', async () => {
    const snapshot = await derivePeerStatusSnapshot(baseConfig, {
      isStarted: () => true,
      libp2p: {
        getConnections: () => [
          {
            remotePeer: {
              toString: () => '16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x',
            },
          },
          {
            remotePeer: {
              toString: () => 'peer-exchange-only',
            },
          },
        ],
        peerStore: {
          all: async () => [
            {
              id: {
                toString: () => '16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x',
              },
              protocols: ['/vac/waku/store/2', '/vac/waku/peer-exchange/2.0.0-alpha1'],
              tags: new Map([
                ['bootstrap', 1],
                ['peer-exchange', 1],
              ]),
            },
            {
              id: {
                toString: () => '16Uiu2HAmPtEAoPPok7VLrpNNC6t92ZQFqLndHvkdx6Fk3CxA4MaG',
              },
              protocols: ['/vac/waku/filter/2'],
              tags: new Map([['bootstrap', 1]]),
            },
            {
              id: {
                toString: () => 'peer-exchange-only',
              },
              protocols: ['/vac/waku/lightpush/2', '/vac/waku/peer-exchange/2.0.0-alpha1'],
              tags: new Map([['peer-exchange', 1]]),
            },
          ],
        },
      },
    } as any);

    expect(snapshot.runtime.isStarted).toBe(true);
    expect(snapshot.summary.connectedPeerCount).toBe(2);
    expect(snapshot.summary.peerExchangeCapableCount).toBe(2);

    const connectedConfiguredPeer = snapshot.connectedPeers.find((peer) =>
      peer.peerId.startsWith('16Uiu2HAmFbD2ZvAF')
    );
    expect(connectedConfiguredPeer?.source).toBe('configured-direct');
    expect(connectedConfiguredPeer?.supportsPeerExchange).toBe(true);
    expect(connectedConfiguredPeer?.capabilities).toContain('store');

    const peerExchangePeer = snapshot.connectedPeers.find(
      (peer) => peer.peerId === 'peer-exchange-only'
    );
    expect(peerExchangePeer?.source).toBe('peer-exchange');
    expect(peerExchangePeer?.capabilities).toContain('lightpush');

    const statuses = new Map(snapshot.configuredPeers.map((peer) => [peer.peerId, peer.status]));
    expect(statuses.get('16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x')).toBe('connected');
    expect(statuses.get('16Uiu2HAmPtEAoPPok7VLrpNNC6t92ZQFqLndHvkdx6Fk3CxA4MaG')).toBe(
      'known-not-connected'
    );
    expect(statuses.get('16Uiu2HAmQdCGG5qREQCq96kucmpUVupmvLwrTRjMazPAaMTNP97A')).toBe(
      'configured-not-observed'
    );
  });
});

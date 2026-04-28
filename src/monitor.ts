import {
  WakuBroadcasterClient,
  BroadcasterDebugger,
  BroadcasterOptions,
} from '@railgun-community/waku-broadcaster-client-node';
import {
  Chain,
  BroadcasterConnectionStatus,
  SelectedBroadcaster,
} from '@railgun-community/shared-models';
import { AppConfig, PeerStatusSnapshot } from './types';
import { isChainNativeToken } from './tokens';
import { COMBINED_EXTENDED_STATIC_NODES } from './waku-connection-config';
import { createEmptyPeerStatusSnapshot, derivePeerStatusSnapshot } from './peer-status-data';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

type TraceBroadcasterEntry = {
  key: string;
  rank: number;
  railgunAddress: string;
  tokenAddress: string;
  feePerUnitGas: string;
  reliability: number;
  expiration: number;
  expiresInMs: number;
  availableWallets: number;
  feesID: string;
  relayAdapt: string;
  isNativeToken: boolean;
};

type TraceEvent = {
  event: string;
  ts: string;
  chain: string;
  scanAt: string;
  [key: string]: unknown;
};

type TraceEventPayload = {
  event: string;
  [key: string]: unknown;
};

export class BroadcasterMonitor extends EventEmitter {
  private config: AppConfig;
  private chain: Chain;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  // State
  private broadcasters: SelectedBroadcaster[] = [];
  private lastScanTime: Date | null = null;
  private connectionStatus: string = 'Initializing...';
  private meshPeerCount: number = 0;
  private peerStatus: PeerStatusSnapshot;
  private previousTraceEntries = new Map<string, TraceBroadcasterEntry>();

  constructor(config: AppConfig) {
    super();
    this.config = config;
    this.chain = {
      type: config.chainType,
      id: config.chainId,
    };
    this.peerStatus = createEmptyPeerStatusSnapshot(config);
  }

  public getBroadcasters(): SelectedBroadcaster[] {
    return this.broadcasters;
  }

  public getStatus(): {
    status: string;
    peers: number;
    lastScan: Date | null;
    trustedFeeSigners: string[];
    peerStatus: PeerStatusSnapshot;
  } {
    return {
      status: this.connectionStatus,
      peers: this.meshPeerCount,
      lastScan: this.lastScanTime,
      trustedFeeSigners: this.config.trustedFeeSigner ?? [],
      peerStatus: this.peerStatus,
    };
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.config.fileLogging) {
      this.logToFile(`\n--- New Session Started at ${new Date().toISOString()} ---\n`);
    }

    if (this.config.traceFees) {
      this.writeTraceEvent({
        event: 'trace_session_started',
        refreshInterval: this.config.refreshInterval,
        filterNative: this.config.filterNative ?? false,
        trustedFeeSignerCount: this.config.trustedFeeSigner?.length ?? 0,
        traceFile: this.getTraceFilePath(),
      });
    }

    this.addLog(`Initializing Waku Broadcaster Client for Chain ID ${this.chain.id}...`, 'info');

    const broadcasterOptions: BroadcasterOptions = {
      // IMPORTANT: trustedFeeSigner has to be set to undefined if we actually want to disable the feature
      // @ts-ignore
      trustedFeeSigner: this.config.trustedFeeSigner,
      useDNSDiscovery: true,
      additionalDirectPeers: this.config.extendedStaticNodes
        ? [...COMBINED_EXTENDED_STATIC_NODES]
        : undefined,
      pubSubTopic: this.config.pubSubTopic,
    };

    this.addLog(`Waku Options: ${JSON.stringify(broadcasterOptions)}`, 'info');

    const broadcasterDebugger: BroadcasterDebugger | undefined = this.config.debug
      ? {
          log: (msg: string) => this.addLog(`[Waku] ${msg}`, 'info'),
          error: (err: Error) => this.addLog(`[Waku Error] ${err.message}`, 'error'),
        }
      : undefined;

    try {
      await WakuBroadcasterClient.start(
        this.chain,
        broadcasterOptions,
        this.handleStatusUpdate.bind(this),
        broadcasterDebugger
      );
      this.addLog('Waku Client started successfully.', 'success');

      // Initial scan
      await this.scan();

      // Start polling
      this.timer = setInterval(async () => {
        await this.scan();
      }, this.config.refreshInterval);
    } catch (error: any) {
      this.addLog(`Failed to start Waku Client: ${error.message}`, 'error');
      this.stop();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    WakuBroadcasterClient.stop().catch((e) => console.error(e));
    this.addLog('Monitor stopped.', 'info');
  }

  private handleStatusUpdate(chain: Chain, status: BroadcasterConnectionStatus) {
    this.connectionStatus = status;
    this.addLog(`Connection Status Update: ${status}`, 'info');
    this.emit('status', this.getStatus());
  }

  private async scan() {
    if (!this.isRunning) return;

    try {
      const allBroadcasters =
        (await WakuBroadcasterClient.findAllBroadcastersForChain(
          this.chain,
          false // useRelayAdapt
        )) || [];

      this.broadcasters = allBroadcasters;

      if (this.config.filterNative) {
        this.broadcasters = this.broadcasters.filter((b) =>
          isChainNativeToken(this.chain.id, b.tokenAddress)
        );
      }

      this.lastScanTime = new Date();

      this.traceScan(allBroadcasters, this.broadcasters, this.lastScanTime);

      if (this.config.debug) {
        try {
          const waku = WakuBroadcasterClient.getWakuCore() as any;
          if (waku && waku.libp2p) {
            const connections = waku.libp2p.getConnections();
            this.addLog(`[Debug] Open Connections: ${connections.length}`, 'info');
          }
        } catch (e) {
          // Ignore debug errors
        }
      }

      try {
        this.meshPeerCount = WakuBroadcasterClient.getMeshPeerCount();
      } catch (e) {
        this.meshPeerCount = 0;
      }

      this.peerStatus = await derivePeerStatusSnapshot(
        this.config,
        WakuBroadcasterClient.getWakuCore() as any,
        {
          pubSubTopic: this.config.pubSubTopic,
          contentTopics: WakuBroadcasterClient.getContentTopics(),
        }
      );

      this.emit('update', this.broadcasters);
      this.emit('status', this.getStatus());
    } catch (e: any) {
      this.addLog(`Scan failed: ${e.message}`, 'error');
    }
  }

  private addLog(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    this.emit('log', { message, type, timestamp: new Date() });
    this.logToFile(`[${type.toUpperCase()}] ${message}`);
  }

  private traceScan(
    allBroadcasters: SelectedBroadcaster[],
    visibleBroadcasters: SelectedBroadcaster[],
    scanTime: Date
  ) {
    if (!this.config.traceFees) {
      return;
    }

    const allEntries = this.createTraceEntries(allBroadcasters);
    const visibleEntries = this.createTraceEntries(visibleBroadcasters);

    this.writeTraceEvent({
      event: 'viewer_scan_snapshot',
      returnedCount: allBroadcasters.length,
      visibleCount: visibleBroadcasters.length,
      nativeFilteredCount: allBroadcasters.length - visibleBroadcasters.length,
      filterNative: this.config.filterNative ?? false,
      entries: allEntries,
    }, scanTime);

    this.writeTraceEvent({
      event: 'viewer_visible_order_snapshot',
      visibleCount: visibleBroadcasters.length,
      filterNative: this.config.filterNative ?? false,
      entries: visibleEntries,
    }, scanTime);

    this.writeTokenRankingSnapshots(visibleEntries, scanTime);
    this.writeScanDiffEvents(visibleEntries, scanTime);
  }

  private createTraceEntries(broadcasters: SelectedBroadcaster[]): TraceBroadcasterEntry[] {
    const now = Date.now();

    return broadcasters.map((broadcaster, index) => ({
      key: this.getTraceKey(broadcaster),
      rank: index + 1,
      railgunAddress: broadcaster.railgunAddress,
      tokenAddress: broadcaster.tokenAddress,
      feePerUnitGas: broadcaster.tokenFee.feePerUnitGas,
      reliability: broadcaster.tokenFee.reliability,
      expiration: broadcaster.tokenFee.expiration,
      expiresInMs: broadcaster.tokenFee.expiration - now,
      availableWallets: broadcaster.tokenFee.availableWallets,
      feesID: broadcaster.tokenFee.feesID,
      relayAdapt: broadcaster.tokenFee.relayAdapt,
      isNativeToken: isChainNativeToken(this.chain.id, broadcaster.tokenAddress),
    }));
  }

  private writeTokenRankingSnapshots(entries: TraceBroadcasterEntry[], scanTime: Date) {
    const byToken = new Map<string, TraceBroadcasterEntry[]>();

    for (const entry of entries) {
      const tokenEntries = byToken.get(entry.tokenAddress) ?? [];
      tokenEntries.push(entry);
      byToken.set(entry.tokenAddress, tokenEntries);
    }

    for (const [tokenAddress, tokenEntries] of byToken.entries()) {
      const rankedEntries = tokenEntries
        .slice()
        .sort((a, b) => {
          const feeDelta = BigInt(a.feePerUnitGas) - BigInt(b.feePerUnitGas);
          if (feeDelta !== 0n) {
            return feeDelta > 0n ? 1 : -1;
          }
          return b.reliability - a.reliability;
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      this.writeTraceEvent(
        {
          event: 'token_ranking_snapshot',
          tokenAddress,
          rankingScope: 'per_token',
          entryCount: rankedEntries.length,
          entries: rankedEntries,
        },
        scanTime
      );
    }
  }

  private writeScanDiffEvents(entries: TraceBroadcasterEntry[], scanTime: Date) {
    const currentEntries = new Map(entries.map((entry) => [entry.key, entry]));

    for (const entry of entries) {
      const previousEntry = this.previousTraceEntries.get(entry.key);
      if (!previousEntry) {
        this.writeTraceEvent(
          {
            event: 'scan_entry_added',
            key: entry.key,
            entry,
          },
          scanTime
        );
        continue;
      }

      const changes: Record<string, { previous: unknown; next: unknown }> = {};
      if (previousEntry.rank !== entry.rank) {
        changes.rank = { previous: previousEntry.rank, next: entry.rank };
      }
      if (previousEntry.feePerUnitGas !== entry.feePerUnitGas) {
        changes.feePerUnitGas = {
          previous: previousEntry.feePerUnitGas,
          next: entry.feePerUnitGas,
        };
      }
      if (previousEntry.reliability !== entry.reliability) {
        changes.reliability = {
          previous: previousEntry.reliability,
          next: entry.reliability,
        };
      }
      if (previousEntry.expiration !== entry.expiration) {
        changes.expiration = {
          previous: previousEntry.expiration,
          next: entry.expiration,
        };
      }
      if (previousEntry.availableWallets !== entry.availableWallets) {
        changes.availableWallets = {
          previous: previousEntry.availableWallets,
          next: entry.availableWallets,
        };
      }
      if (previousEntry.feesID !== entry.feesID) {
        changes.feesID = { previous: previousEntry.feesID, next: entry.feesID };
      }
      if (previousEntry.relayAdapt !== entry.relayAdapt) {
        changes.relayAdapt = {
          previous: previousEntry.relayAdapt,
          next: entry.relayAdapt,
        };
      }

      if (Object.keys(changes).length > 0) {
        this.writeTraceEvent(
          {
            event: 'scan_entry_updated',
            key: entry.key,
            railgunAddress: entry.railgunAddress,
            tokenAddress: entry.tokenAddress,
            changes,
          },
          scanTime
        );
      }

      if (previousEntry.rank !== entry.rank) {
        this.writeTraceEvent(
          {
            event: 'scan_rank_changed',
            key: entry.key,
            railgunAddress: entry.railgunAddress,
            tokenAddress: entry.tokenAddress,
            previousRank: previousEntry.rank,
            nextRank: entry.rank,
            feePerUnitGas: entry.feePerUnitGas,
            reliability: entry.reliability,
            expiresInMs: entry.expiresInMs,
          },
          scanTime
        );
      }
    }

    for (const [key, previousEntry] of this.previousTraceEntries.entries()) {
      if (!currentEntries.has(key)) {
        this.writeTraceEvent(
          {
            event: 'scan_entry_removed',
            key,
            entry: previousEntry,
          },
          scanTime
        );
      }
    }

    this.previousTraceEntries = currentEntries;
  }

  private getTraceKey(broadcaster: SelectedBroadcaster): string {
    return [
      broadcaster.tokenAddress.toLowerCase(),
      broadcaster.railgunAddress,
      broadcaster.tokenFee.feesID,
    ].join('|');
  }

  private getTraceFilePath(): string {
    return path.resolve(process.cwd(), this.config.traceFeesFile || 'broadcaster-fee-trace.jsonl');
  }

  private writeTraceEvent(payload: TraceEventPayload, scanTime?: Date) {
    if (!this.config.traceFees) {
      return;
    }

    const now = new Date();
    const event: TraceEvent = {
      ...payload,
      ts: now.toISOString(),
      chain: `${this.chain.type}:${this.chain.id}`,
      scanAt: (scanTime ?? now).toISOString(),
    };

    const tracePath = this.getTraceFilePath();

    try {
      fs.mkdirSync(path.dirname(tracePath), { recursive: true });
      fs.appendFileSync(tracePath, JSON.stringify(event) + '\n');
    } catch {
      // Ignore file write errors
    }
  }

  private logToFile(message: string) {
    if (!this.config.fileLogging) return;

    const logPath = path.resolve(process.cwd(), 'broadcaster-viewer.log');
    const timestamp = new Date().toISOString();
    const line =
      message.startsWith('\n') || message.startsWith('---') ? message : `[${timestamp}] ${message}`;

    try {
      fs.appendFileSync(logPath, line + '\n');
    } catch (e) {
      // Ignore file write errors
    }
  }
}

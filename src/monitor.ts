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
import { AppConfig } from './types';
import { isChainNativeToken } from './tokens';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

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

  constructor(config: AppConfig) {
    super();
    this.config = config;
    this.chain = {
      type: config.chainType,
      id: config.chainId,
    };
  }

  public getBroadcasters(): SelectedBroadcaster[] {
    return this.broadcasters;
  }

  public getStatus(): {
    status: string;
    peers: number;
    lastScan: Date | null;
    hasSigner: boolean;
  } {
    return {
      status: this.connectionStatus,
      peers: this.meshPeerCount,
      lastScan: this.lastScanTime,
      hasSigner: (this.config.trustedFeeSigner?.length ?? 0) > 0,
    };
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.config.fileLogging) {
      this.logToFile(`\n--- New Session Started at ${new Date().toISOString()} ---\n`);
    }

    this.addLog(`Initializing Waku Broadcaster Client for Chain ID ${this.chain.id}...`, 'info');

    const broadcasterOptions: BroadcasterOptions = {
      // @ts-ignore
      trustedFeeSigner: this.config.trustedFeeSigner,
      useDNSDiscovery: true,
      additionalDirectPeers: [
        '/dns4/prod.rootedinprivacy.com/tcp/30304/p2p/16Uiu2HAkwNeQVY32bUrL1eM68ryMa48PXY5Bhfxfg9e2byYcc46m',
        '/dns4/prod.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAkwNeQVY32bUrL1eM68ryMa48PXY5Bhfxfg9e2byYcc46m',
      ],
      pubSubTopic: this.config.pubSubTopic ?? '/waku/2/rs/1/1',
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
      this.broadcasters =
        (await WakuBroadcasterClient.findAllBroadcastersForChain(
          this.chain,
          false // useRelayAdapt
        )) || [];

      if (this.config.filterNative) {
        this.broadcasters = this.broadcasters.filter((b) =>
          isChainNativeToken(this.chain.id, b.tokenAddress)
        );
      }

      this.lastScanTime = new Date();

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

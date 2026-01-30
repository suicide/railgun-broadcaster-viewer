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
import { createBroadcasterTable, formatLogMessage } from './ui';
import chalk from 'chalk';
import logUpdate from 'log-update';
import fs from 'fs';
import path from 'path';

export class BroadcasterMonitor {
  private config: AppConfig;
  private chain: Chain;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  // State for rendering
  private logs: string[] = [];
  private broadcasters: SelectedBroadcaster[] = [];
  private lastScanTime: Date | null = null;
  private connectionStatus: string = 'Initializing...';
  private meshPeerCount: number = 0;

  constructor(config: AppConfig) {
    this.config = config;
    this.chain = {
      type: config.chainType,
      id: config.chainId,
    };
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.config.fileLogging) {
      this.logToFile(`\n--- New Session Started at ${new Date().toISOString()} ---\n`);
    }

    this.addLog(`Initializing Waku Broadcaster Client for Chain ID ${this.chain.id}...`);

    const broadcasterOptions: BroadcasterOptions = {
      trustedFeeSigner: this.config.trustedFeeSigner ?? '',
      useDNSDiscovery: true,
      pubSubTopic: this.config.pubSubTopic ?? '/waku/2/rs/1/1',
    };

    this.addLog(`Waku Options: ${JSON.stringify(broadcasterOptions)}`, 'info');

    this.render();

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
      this.render();

      // Initial scan
      await this.scan();

      // Start polling
      this.timer = setInterval(async () => {
        await this.scan();
      }, this.config.refreshInterval);
    } catch (error: any) {
      this.addLog(`Failed to start Waku Client: ${error.message}`, 'error');
      this.render();
      this.stop();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    WakuBroadcasterClient.stop().catch(console.error);
    this.addLog('Monitor stopped.');
    this.render();
  }

  private handleStatusUpdate(chain: Chain, status: BroadcasterConnectionStatus) {
    this.connectionStatus = status;
    this.addLog(`Connection Status Update: ${status}`, 'info');
    this.render();
  }

  private async scan() {
    if (!this.isRunning) return;

    // Optional: Log that we are scanning?
    // this.addLog('Scanning for broadcasters...', 'info');
    // this.render();

    try {
      this.broadcasters =
        (await WakuBroadcasterClient.findAllBroadcastersForChain(
          this.chain,
          false // useRelayAdapt
        )) || [];

      this.lastScanTime = new Date();

      if (this.config.debug) {
        try {
          const waku = WakuBroadcasterClient.getWakuCore() as any;
          if (waku && waku.libp2p) {
            const connections = waku.libp2p.getConnections();
            this.addLog(`[Debug] Open Connections: ${connections.length}`, 'info');
            for (const conn of connections) {
              this.addLog(`[Debug] Connected to: ${conn.remoteAddr.toString()}`, 'info');
            }
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

      this.render();
    } catch (e: any) {
      this.addLog(`Scan failed: ${e.message}`, 'error');
      this.render();
    }
  }

  private addLog(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const formatted = formatLogMessage(message, type);
    this.logs.push(formatted);
    // Keep only last 8 logs
    if (this.logs.length > 8) {
      this.logs.shift();
    }
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
      // Ignore file write errors to avoid crashing the monitor
    }
  }

  private render() {
    const lines: string[] = [];

    // Header
    lines.push(chalk.bold.underline(`Railgun Broadcaster Monitor (Chain: ${this.chain.id})`));
    lines.push(
      `${chalk.bold('Status:')} ${this.connectionStatus}  |  ${chalk.bold('Mesh Peers:')} ${this.meshPeerCount}`
    );

    const signerDisplay = this.config.trustedFeeSigner
      ? `${this.config.trustedFeeSigner.substring(0, 10)}...`
      : chalk.yellow('Disabled (No protection)');

    lines.push(`${chalk.bold('Trusted Signer:')} ${signerDisplay}`);

    if (this.lastScanTime) {
      lines.push(`${chalk.bold('Last Scan:')} ${this.lastScanTime.toLocaleTimeString()}`);
    } else {
      lines.push(`${chalk.bold('Last Scan:')} Pending...`);
    }

    lines.push(''); // Spacer

    // Logs Section
    lines.push(chalk.dim('--- Recent Logs ---'));
    if (this.logs.length === 0) {
      lines.push(chalk.gray('(No logs yet)'));
    } else {
      lines.push(...this.logs);
    }
    lines.push(''); // Spacer

    // Table Section
    if (this.broadcasters.length === 0) {
      lines.push(chalk.yellow('No broadcasters found yet.'));
    } else {
      lines.push(createBroadcasterTable(this.broadcasters, this.chain.id));
    }

    logUpdate(lines.join('\n'));
  }
}

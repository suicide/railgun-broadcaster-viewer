import { WakuBroadcasterClient } from '@railgun-community/waku-broadcaster-client-node';
import {
  Chain,
  BroadcasterConnectionStatus,
  SelectedBroadcaster,
} from '@railgun-community/shared-models';
import { AppConfig } from './types';
import { createBroadcasterTable, formatLogMessage } from './ui';
import chalk from 'chalk';
import logUpdate from 'log-update';

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

    this.addLog(`Initializing Waku Broadcaster Client for Chain ID ${this.chain.id}...`);
    this.render();

    const broadcasterOptions = {
      trustedFeeSigner: this.config.trustedFeeSigner,
    };

    try {
      await WakuBroadcasterClient.start(
        this.chain,
        broadcasterOptions,
        this.handleStatusUpdate.bind(this)
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
  }

  private render() {
    const lines: string[] = [];

    // Header
    lines.push(chalk.bold.underline(`Railgun Broadcaster Monitor (Chain: ${this.chain.id})`));
    lines.push(
      `${chalk.bold('Status:')} ${this.connectionStatus}  |  ${chalk.bold('Mesh Peers:')} ${this.meshPeerCount}`
    );
    lines.push(
      `${chalk.bold('Trusted Signer:')} ${this.config.trustedFeeSigner.substring(0, 10)}...`
    );

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
      lines.push(createBroadcasterTable(this.broadcasters));
    }

    logUpdate(lines.join('\n'));
  }
}

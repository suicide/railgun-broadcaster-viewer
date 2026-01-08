import { WakuBroadcasterClient } from '@railgun-community/waku-broadcaster-client-node';
import {
  Chain,
  BroadcasterConnectionStatus,
  SelectedBroadcaster,
} from '@railgun-community/shared-models';
import { AppConfig } from './types';
import { createBroadcasterTable, logStatus } from './ui';
import chalk from 'chalk';

export class BroadcasterMonitor {
  private config: AppConfig;
  private chain: Chain;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

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

    logStatus(`Initializing Waku Broadcaster Client for Chain ID ${this.chain.id}...`);

    const broadcasterOptions = {
      trustedFeeSigner: this.config.trustedFeeSigner,
      // Default timeouts/options can be added here if needed
    };

    try {
      await WakuBroadcasterClient.start(
        this.chain,
        broadcasterOptions,
        this.handleStatusUpdate.bind(this)
      );
      logStatus('Waku Client started successfully.', 'success');

      // Initial scan
      await this.scan();

      // Start polling
      this.timer = setInterval(async () => {
        await this.scan();
      }, this.config.refreshInterval);
    } catch (error: any) {
      logStatus(`Failed to start Waku Client: ${error.message}`, 'error');
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
    logStatus('Monitor stopped.');
  }

  private handleStatusUpdate(chain: Chain, status: BroadcasterConnectionStatus) {
    // Convert status enum to readable string if needed, or just log raw
    // Note: You might want to map the enum to strings if they are numbers
    logStatus(`Connection Status Update: ${status}`, 'info');
  }

  private async scan() {
    if (!this.isRunning) return;

    logStatus('Scanning for broadcasters...', 'info');

    // Wait for peer discovery if needed (basic delay is often useful in waku context)
    // But since we are polling, we just query what we have.

    // Using relayAdapt = false for general scanning by default
    const broadcasters: SelectedBroadcaster[] =
      (await WakuBroadcasterClient.findAllBroadcastersForChain(
        this.chain,
        false // useRelayAdapt
      )) || [];

    console.clear();
    console.log(chalk.bold.underline(`Railgun Broadcaster Monitor (Chain: ${this.chain.id})`));
    console.log(`Trusted Signer: ${this.config.trustedFeeSigner}`);
    console.log(`Last Scan: ${new Date().toLocaleTimeString()}`);
    console.log('');

    if (broadcasters.length === 0) {
      console.log(chalk.yellow('No broadcasters found yet. Waiting for peers/updates...'));
    } else {
      console.log(createBroadcasterTable(broadcasters));
    }

    // Also show peer counts if available via static methods
    try {
      const meshPeers = WakuBroadcasterClient.getMeshPeerCount();
      console.log(`\nMesh Peers: ${meshPeers}`);
    } catch (e) {
      // Ignore if method not available or fails
    }
  }
}

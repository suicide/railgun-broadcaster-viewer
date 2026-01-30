#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './types';
import { BroadcasterMonitor } from './monitor';
import chalk from 'chalk';

const program = new Command();

// Default values
const DEFAULT_CHAIN_ID = 1; // Ethereum Mainnet
const DEFAULT_CHAIN_TYPE = 0; // EVM
const DEFAULT_REFRESH = 30000; // 30 seconds
const DEFAULT_SIGNER =
  '0zk1qyzgh9ctuxm6d06gmax39xutjgrawdsljtv80lqnjtqp3exxayuf0rv7j6fe3z53laetcl9u3cma0q9k4npgy8c8ga4h6mx83v09m8ewctsekw4a079dcl5sw4k';

program
  .version('1.0.0')
  .description('CLI tool to monitor Railgun Broadcasters on Waku')
  .option('-c, --config <path>', 'Path to config JSON file')
  .option('--chain-id <number>', 'Chain ID to monitor', parseInt)
  .option('--signer <string>', 'Trusted Fee Signer Public Key (establishes fee baseline)')
  .option('--no-signer', 'Disable Trusted Fee Signer (CAUTION: Removes fee protections)')
  .option('--refresh <number>', 'Refresh interval in milliseconds', parseInt)
  .option('--debug', 'Enable debug logging')
  .option('--log-to-file', 'Enable logging to file')
  .action(async (options) => {
    let config: AppConfig = {
      chainType: DEFAULT_CHAIN_TYPE,
      chainId: DEFAULT_CHAIN_ID,
      trustedFeeSigner: DEFAULT_SIGNER,
      refreshInterval: DEFAULT_REFRESH,
      debug: options.debug || false,
      fileLogging: options.logToFile || false,
    };

    // Load from config file if present
    if (options.config) {
      const configPath = path.resolve(process.cwd(), options.config);
      if (fs.existsSync(configPath)) {
        try {
          const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          config = { ...config, ...fileConfig };
          console.log(chalk.blue(`Loaded config from ${configPath}`));
        } catch (error) {
          console.error(chalk.red(`Error reading config file: ${(error as Error).message}`));
          process.exit(1);
        }
      } else {
        console.error(chalk.red(`Config file not found: ${configPath}`));
        process.exit(1);
      }
    }

    // Override with CLI args
    if (options.chainId) config.chainId = options.chainId;
    if (options.signer) {
      config.trustedFeeSigner = options.signer;
    } else if (options.signer === false) {
      // --no-signer passed
      config.trustedFeeSigner = undefined;
    }
    if (options.refresh) config.refreshInterval = options.refresh;

    const monitor = new BroadcasterMonitor(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.bold('\nStopping monitor...'));
      monitor.stop();
      process.exit(0);
    });

    await monitor.start();
  });

program.parse(process.argv);

#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './types.js';
import { BroadcasterMonitor } from './monitor.js';
import { App } from './ui/App.js';
import chalk from 'chalk';
import { RAILWAY_SIGNERS, TERMINAL_SIGNERS } from './signers.js';

const program = new Command();

// Default values
const DEFAULT_CHAIN_ID = 1; // Ethereum Mainnet
const DEFAULT_CHAIN_TYPE = 0; // EVM
const DEFAULT_REFRESH = 30000; // 30 seconds

program
  .version('1.0.0')
  .description('CLI tool to monitor Railgun Broadcasters on Waku')
  .option('-c, --config <path>', 'Path to config JSON file')
  .option('--chain-id <number>', 'Chain ID to monitor', parseInt)
  .option(
    '--signer [addresses...]',
    'Trusted Fee Signer Public Key (establishes fee baseline). Can be used multiple times.'
  )
  .option('--no-signer', 'Disable Trusted Fee Signer (CAUTION: Removes fee protections)')
  .option('--railway', 'Add Railway Wallet trusted fee signers')
  .option('--terminal', 'Add Terminal Wallet trusted fee signers')
  .option('--refresh <number>', 'Refresh interval in milliseconds', parseInt)
  .option('--native-only', 'Filter to show only native token fees')
  .option('--debug', 'Enable debug logging')
  .option('--log-to-file', 'Enable logging to file')
  .action(async (options) => {
    let config: AppConfig = {
      chainType: DEFAULT_CHAIN_TYPE,
      chainId: DEFAULT_CHAIN_ID,
      trustedFeeSigner: undefined,
      refreshInterval: DEFAULT_REFRESH,
      filterNative: options.nativeOnly || false,
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
          // console.log(chalk.blue(`Loaded config from ${configPath}`));
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

    const signers: string[] = [];

    // 1. Existing config signers (from file)
    if (config.trustedFeeSigner) {
      if (Array.isArray(config.trustedFeeSigner)) {
        signers.push(...config.trustedFeeSigner);
      } else {
        signers.push(config.trustedFeeSigner as string);
      }
    }

    // 2. CLI --signer flags
    if (options.signer && options.signer !== false) {
      // With [addresses...], options.signer is string[] if multiple args provided, or string if one
      if (Array.isArray(options.signer)) {
        signers.push(...options.signer);
      } else {
        signers.push(options.signer as string);
      }
    }

    // 3. Wallet flags
    if (options.railway) {
      signers.push(...RAILWAY_SIGNERS);
    }
    if (options.terminal) {
      signers.push(...TERMINAL_SIGNERS);
    }

    // 4. Handle --no-signer (options.signer === false)
    if (options.signer === false) {
      config.trustedFeeSigner = undefined;
    } else {
      // Deduplicate and set
      const uniqueSigners = Array.from(new Set(signers));
      config.trustedFeeSigner = uniqueSigners.length > 0 ? uniqueSigners : undefined;
    }

    if (options.refresh) config.refreshInterval = options.refresh;

    const monitor = new BroadcasterMonitor(config);

    // Enter Alt Screen
    process.stdout.write('\x1b[?1049h');

    // Render the TUI
    const { waitUntilExit } = render(
      React.createElement(App, { monitor, chainId: config.chainId })
    );

    // Start monitoring
    monitor.start();

    // Cleanup on exit
    try {
      await waitUntilExit();
    } catch (e) {
      // Ignore
    }
    monitor.stop();
    // Exit Alt Screen
    process.stdout.write('\x1b[?1049l');
    process.exit(0);
  });

program.parse(process.argv);

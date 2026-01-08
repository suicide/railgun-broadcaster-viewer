import Table from 'cli-table3';
import chalk from 'chalk';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import {
  TokenAddressEthereum,
  TokenAddressBSC,
  TokenAddressPolygonPOS,
  TokenAddressArbitrum,
} from './tokens';

export function createBroadcasterTable(broadcasters: SelectedBroadcaster[], chainId: number) {
  const table = new Table({
    head: [
      chalk.cyan('Railgun Address'),
      chalk.cyan('Token'),
      chalk.cyan('Fee'),
      chalk.cyan('Exp.'),
      chalk.cyan('Rel.'),
      chalk.cyan('Wallets'),
      chalk.cyan('Relay Adapt'),
    ],
    colWidths: [35, 30, 15, 10, 8, 9, 20],
  });

  broadcasters.forEach((b) => {
    const address = truncateMiddle(b.railgunAddress, 30);
    let token = truncateMiddle(b.tokenAddress, 25);

    const tokenName = getTokenName(chainId, b.tokenAddress);
    if (tokenName) {
      token = `${chalk.bold(tokenName)} (${truncateMiddle(b.tokenAddress, 16)})`;
    }

    const reliability = Math.round(b.tokenFee.reliability * 100) + '%';
    const relayAdapt = truncateMiddle(b.tokenFee.relayAdapt, 18);

    table.push([
      address,
      token,
      chalk.green(b.tokenFee.feePerUnitGas.toString()),
      new Date(b.tokenFee.expiration).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      reliability,
      b.tokenFee.availableWallets.toString(),
      relayAdapt,
    ]);
  });

  return table.toString();
}

function getTokenName(chainId: number, address: string): string | undefined {
  const normalizedAddress = address.toLowerCase();

  const findToken = (enumObj: any) => {
    return Object.keys(enumObj).find((key) => enumObj[key].toLowerCase() === normalizedAddress);
  };

  switch (chainId) {
    case 1: // Ethereum
      return findToken(TokenAddressEthereum);
    case 56: // BSC
      return findToken(TokenAddressBSC);
    case 137: // Polygon
      return findToken(TokenAddressPolygonPOS);
    case 42161: // Arbitrum
      return findToken(TokenAddressArbitrum);
    default:
      return undefined;
  }
}

function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sideLength = Math.floor((maxLength - 3) / 2);
  return text.slice(0, sideLength) + '...' + text.slice(-sideLength);
}

export function formatLogMessage(
  message: string,
  type: 'info' | 'success' | 'error' | 'warn' = 'info'
): string {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = chalk.gray(`[${timestamp}]`);

  switch (type) {
    case 'success':
      return `${prefix} ${chalk.green('✔')} ${message}`;
    case 'error':
      return `${prefix} ${chalk.red('✖')} ${message}`;
    case 'warn':
      return `${prefix} ${chalk.yellow('⚠')} ${message}`;
    case 'info':
    default:
      return `${prefix} ${chalk.blue('ℹ')} ${message}`;
  }
}

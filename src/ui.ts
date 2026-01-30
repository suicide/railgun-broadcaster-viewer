import Table from 'cli-table3';
import chalk from 'chalk';
import { SelectedBroadcaster } from '@railgun-community/shared-models';
import { getTokenName, isChainNativeToken, getTokenDecimals } from './tokens';
import { formatUnits } from 'ethers';

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
    colWidths: [35, 30, 20, 10, 8, 9, 20],
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

    // Format Fee
    const decimals = getTokenDecimals(chainId, b.tokenAddress);
    const feeRaw = b.tokenFee.feePerUnitGas;
    let feeFormatted = '';

    if (isChainNativeToken(chainId, b.tokenAddress)) {
      // 1 Gwei = 1e9 Wei.
      const feeGwei = parseFloat(formatUnits(feeRaw, 9));
      feeFormatted = `${feeGwei.toFixed(2)} Gwei`;
    } else {
      // For other tokens, show the decimal value + Symbol
      const val = parseFloat(formatUnits(feeRaw, decimals));
      let valStr = '';
      if (val === 0) {
        valStr = '0';
      } else if (val < 0.0001) {
        valStr = val.toExponential(2);
      } else {
        valStr = val.toFixed(6).replace(/\.?0+$/, '');
      }
      feeFormatted = `${valStr} ${tokenName || ''}`;
    }

    table.push([
      address,
      token,
      chalk.green(feeFormatted),
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

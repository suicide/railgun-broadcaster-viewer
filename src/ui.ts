import Table from 'cli-table3';
import chalk from 'chalk';
import { SelectedBroadcaster } from '@railgun-community/shared-models';

export function createBroadcasterTable(broadcasters: SelectedBroadcaster[]) {
  const table = new Table({
    head: [
      chalk.cyan('Railgun Address'),
      chalk.cyan('Token Address'),
      chalk.cyan('Fee Per Unit Gas'),
      chalk.cyan('Expiration'),
    ],
    colWidths: [40, 40, 20, 15],
  });

  broadcasters.forEach((b) => {
    const address = truncateMiddle(b.railgunAddress, 36);
    const token = truncateMiddle(b.tokenAddress, 36);

    table.push([
      address,
      token,
      chalk.green(b.tokenFee.feePerUnitGas.toString()),
      new Date(b.tokenFee.expiration).toLocaleTimeString(),
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

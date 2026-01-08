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
    // Truncate address for display if too long
    const address =
      b.railgunAddress.length > 36 ? b.railgunAddress.substring(0, 36) + '...' : b.railgunAddress;

    const token =
      b.tokenAddress.length > 36 ? b.tokenAddress.substring(0, 36) + '...' : b.tokenAddress;

    table.push([
      address,
      token,
      chalk.green(b.tokenFee.feePerUnitGas.toString()),
      new Date(b.tokenFee.expiration).toLocaleTimeString(),
    ]);
  });

  return table.toString();
}

export function logStatus(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = chalk.gray(`[${timestamp}]`);

  switch (type) {
    case 'success':
      console.log(`${prefix} ${chalk.green('✔')} ${message}`);
      break;
    case 'error':
      console.log(`${prefix} ${chalk.red('✖')} ${message}`);
      break;
    case 'warn':
      console.log(`${prefix} ${chalk.yellow('⚠')} ${message}`);
      break;
    case 'info':
    default:
      console.log(`${prefix} ${chalk.blue('ℹ')} ${message}`);
      break;
  }
}

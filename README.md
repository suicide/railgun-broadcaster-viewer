# Railgun Broadcaster Viewer

A simple CLI tool to monitor Railgun broadcasters on the Waku network. This tool connects to the
Waku network, finds available broadcasters for a specific chain, and displays their fees and status
in a real-time updating table.

## Features

- **Real-time Monitoring**: Connects to Waku and continuously scans for broadcasters.
- **Detailed Info**: Displays Railgun Address, Token Address, Fee per Unit Gas, and Expiration.
- **Configurable**: Support for command-line arguments and a JSON configuration file.
- **Cross-Chain Support**: Configurable Chain ID and Chain Type (default: Ethereum Mainnet).

## Installation

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd broadcast-viewer
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Build the project**:
    ```bash
    npm run build
    ```

## Usage

You can run the tool using `npm start` (which uses `ts-node`) or by running the built JavaScript in
`dist/`.

### Quick Start

```bash
# Run with a specific Trusted Fee Signer (Required for valid results)
npm start -- --signer <YOUR_TRUSTED_SIGNER_PUBLIC_KEY>
```

### Command Line Options

| Option                | Description                                             | Default        |
| --------------------- | ------------------------------------------------------- | -------------- |
| `-c, --config <path>` | Path to a JSON configuration file                       | None           |
| `--chain-id <number>` | The Chain ID to monitor                                 | `1` (Ethereum) |
| `--signer <string>`   | The Trusted Fee Signer Public Key                       | Placeholder    |
| `--refresh <number>`  | Refresh interval in milliseconds                        | `10000` (10s)  |
| `--debug`             | Enable debug logging (shows Waku internal logs & peers) | `false`        |
| `--log-to-file`       | Enable logging to `broadcaster-viewer.log`              | `false`        |
| `-h, --help`          | Display help information                                |                |

### Log File

When `--log-to-file` is used, logs are appended to `broadcaster-viewer.log` in the project root.
This file is git-ignored and contains plain text logs with timestamps.

### Configuration File

You can create a `config.json` file to store your settings. A template is provided in
`config.example.json`.

Note: Debug options (`debug` and `logToFile`) can also be set in the configuration file, although
using the CLI flags is the primary usage pattern for these features.

```json
{
  "chainType": 0,
  "chainId": 1,
  "trustedFeeSigner": "YOUR_TRUSTED_FEE_SIGNER_KEY_HERE",
  "refreshInterval": 10000
}
```

Run with config:

```bash
npm start -- --config config.json
```

## User Interface Guide

When you run the tool, you will see a real-time dashboard divided into three main sections:

### 1. Dashboard Header

The top section provides high-level status information:

- **Title**: Shows the current Chain ID being monitored (e.g., `Chain: 1` for Ethereum).
- **Status**: The current connection state to the Waku network (e.g., `Connected`, `Searching`).
- **Mesh Peers**: The number of active peers in the Waku mesh network. A higher number generally
  indicates better connectivity.
- **Trusted Signer**: The beginning of the public key used to verify broadcaster fees.
- **Last Scan**: The timestamp of the most recent data refresh.

### 2. Recent Logs

A scrolling window displaying the last 8 system events, such as:

- Connection status updates.
- Waku client initialization steps.
- Errors or warnings (e.g., failed scans).

### 3. Broadcaster Table

The main table lists all active broadcasters found on the network.

| Column              | Description                                                                                      |
| :------------------ | :----------------------------------------------------------------------------------------------- |
| **Railgun Address** | The truncated 0zk-address of the broadcaster.                                                    |
| **Token**           | The token accepted for fees (e.g., `WETH`, `USDC`). Includes the truncated contract address.     |
| **Gas Price**       | The cost per unit of gas charged by the broadcaster (see "Understanding Gas Prices" below).      |
| **Exp.**            | The time when the current fee quote expires.                                                     |
| **Rel.**            | **Reliability Score** (0-100%). Indicates the historical uptime/success rate of the broadcaster. |
| **Wallets**         | **Available Wallets**. The number of concurrent transactions the broadcaster can process.        |
| **Relay Adapt**     | The address of the Relay Adapt contract used for cross-contract verification.                    |

## Understanding Gas Prices

The **Gas Price** column displays the rate charged by the broadcaster. It is formatted differently
based on the token type to maximize readability:

- **Native Tokens (ETH, BNB, MATIC)**: Displayed in **Gwei** (e.g., `25.00 Gwei`).
  - `1 Gwei = 10^-9 ETH`.
  - This matches standard gas price tracking tools like Etherscan.

- **Other Tokens (USDC, DAI, RAIL)**: Displayed in **Decimal Units** followed by the symbol (e.g.,
  `0.00006 USDC`).
  - This represents the exact amount of token charged per unit of gas.

### Cost Calculation Example

If a transaction requires **200,000 Gas**:

1.  **Native Token (e.g., 25 Gwei)**:
    - Calculation: `200,000 * 25 Gwei`
    - Total: `5,000,000 Gwei` (or `0.005 ETH`)

2.  **Stablecoin (e.g., 0.00006 USDC)**:
    - Calculation: `200,000 * 0.00006 USDC`
    - Total: `12.00 USDC`

## Development

- **Format Code**:

  ```bash
  npm run format
  ```

- **Build**:
  ```bash
  npm run build
  ```

## License

MIT

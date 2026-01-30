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

# Run on Ethereum Sepolia
npm start -- --chain-id 11155111 --signer <YOUR_TRUSTED_SIGNER_PUBLIC_KEY>
```

### Command Line Options

| Option                | Description                                                          | Default        |
| --------------------- | -------------------------------------------------------------------- | -------------- |
| `-c, --config <path>` | Path to a JSON configuration file                                    | None           |
| `--chain-id <number>` | The Chain ID to monitor (e.g., 1 for Ethereum, 11155111 for Sepolia) | `1` (Ethereum) |
| `--signer <string>`   | The Trusted Fee Signer Public Key                                    | Placeholder    |
| `--refresh <number>`  | Refresh interval in milliseconds                                     | `10000` (10s)  |
| `--debug`             | Enable debug logging (shows Waku internal logs & peers)              | `false`        |
| `--log-to-file`       | Enable logging to `broadcaster-viewer.log`                           | `false`        |
| `-h, --help`          | Display help information                                             |                |

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

## The Trusted Fee Signer

The \`trustedFeeSigner\` is a security configuration setting that establishes a "source of truth"
for Relayer fees. It protects the client from interacting with Relayers that attempt price gouging
or malicious spamming by enforcing a strict fee variance.

As it is just a client-side concept, there is no code for it in this broadcaster app. However,
knowing the concept is relevant for configuration of fees.

### Usage

Accepts a single Railgun wallet public key (string) or a list of keys (string[]).

### How it Works

1.  **Baseline Calculation**: The client listens for fee broadcasts specifically from the configured
    \`trustedFeeSigner\`(s). If multiple are provided, it calculates an average baseline fee.
2.  **Variance Enforcement**: When any other Relayer broadcasts a fee, the client compares it
    against this baseline. The Relayer is only accepted if their fee falls within the allowed
    variance (Default: -10% to +30% of the trusted baseline).
3.  **Filtering**: Relayers charging fees outside this window are automatically ignored and excluded
    from the selection pool.

### Critical Behavior

If \`trustedFeeSigner\` is configured, the client will not select any Relayer until it has received
at least one valid fee broadcast from a trusted signer to establish the baseline.

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
| **Fee**             | The cost per unit of gas charged by the broadcaster (see "Understanding Fees" below).            |
| **Exp.**            | The time when the current fee quote expires.                                                     |
| **Rel.**            | **Reliability Score** (0-100%). Indicates the historical uptime/success rate of the broadcaster. |
| **Wallets**         | **Available Wallets**. The number of concurrent transactions the broadcaster can process.        |
| **Relay Adapt**     | The address of the Relay Adapt contract used for cross-contract verification.                    |

## Understanding Fees

The published fees represent the Broadcaster's exchange rate for accepting a specific token in
exchange for paying gas.

### Meaning

The fee value indicates how much of the Fee Token (e.g., USDC) is required to cover 1 full unit of
the network's Gas Token (e.g., 1 ETH, 1 MATIC, 1 BNB).

- **Logic:** `Fee = (Gas Token Price / Fee Token Price) * Profit Margin`
- **Example:** If ETH is $2000 and USDC is $1, and the broadcaster wants a 10% fee/profit buffer,
  the fee will represent ~2200 USDC per 1 ETH.

### Unit

The fees are published as BigInt integers representing the smallest unit (base units) of the Fee
Token.

- For USDC (6 decimals): A fee of `2200000000` means `2,200.000000` USDC per 1 ETH.
- For DAI (18 decimals): A fee of `2200000000000000000000` means `2,200.000000000000000000` DAI per
  1 ETH.

### How Clients Use It

When a client (wallet) wants to send a transaction, they estimate the gas cost (e.g., 0.005 ETH) and
multiply it by this fee to determine how much they must pay the broadcaster:

`Payment = Gas Limit (in ETH) * Published Fee (USDC per ETH)`

## Running with OpenVPN (Gluetun)

This project includes a Docker/Podman Compose setup that routes all traffic through a VPN using
Gluetun. This is useful for privacy or bypassing network restrictions.

1.  **Configure OpenVPN**: Place your OpenVPN configuration file named `custom.conf` inside the
    `vpn-config` directory in the project root.
    - If your `.ovpn` file references external auth files, ensure they are also in that folder and
      paths are relative (e.g., `./auth.txt`).

    _Note: The `vpn-config` directory is git-ignored to protect your credentials._

2.  **Start the Application**: Run the following command:

    ```bash
    docker-compose up --build
    ```

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

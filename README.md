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

| Option                | Description                       | Default        |
| --------------------- | --------------------------------- | -------------- |
| `-c, --config <path>` | Path to a JSON configuration file | None           |
| `--chain-id <number>` | The Chain ID to monitor           | `1` (Ethereum) |
| `--signer <string>`   | The Trusted Fee Signer Public Key | Placeholder    |
| `--refresh <number>`  | Refresh interval in milliseconds  | `10000` (10s)  |
| `-h, --help`          | Display help information          |                |

### Configuration File

You can create a `config.json` file to store your settings. A template is provided in
`config.example.json`.

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

## Understanding the Output

The tool displays a real-time table of available broadcasters. Here is an explanation of the key
columns to help you interpret the data:

### Number of Available Wallets (Concurrency)

This column (`Wallets`) indicates the number of separate wallets the broadcaster has available to
sign and send transactions.

- **Why it matters:** A higher number means the broadcaster can process multiple transactions
  simultaneously (concurrency). This reduces the chance of your transaction being queued or stuck if
  the broadcaster is busy serving other users.

### Relay Adapt Contract (Verification)

This column (`Relay Adapt`) shows the address of the Relay Adapt contract used by the broadcaster.

- **Why it matters:** The Relay Adapt contract is a security component that facilitates
  cross-contract calls from private balances. It verifies that the transaction data is correct and
  ensures the broadcaster cannot manipulate the transaction's outcome.

### Fee Per Unit Gas (Cost Calculation)

This column (`Gas Price`) displays the price the broadcaster charges for every unit of gas consumed
by the transaction.

- **Why it matters:** This allows you to calculate the cost-effectiveness of using a specific
  broadcaster.
- **How to read it:**
  - **Gwei (e.g., 25.00 Gwei):** Used for native tokens like ETH, BNB, or MATIC. `1 Gwei = 10^-9`.
  - **Token Amount (e.g., 0.00006 USDC):** Used for other tokens. This is the exact amount of the
    token charged per unit of gas.

**Example Calculation:**

If a transaction consumes **200,000 Gas**:

1.  **Scenario A (Native Token)**: Gas Price is `25 Gwei` (0.000000025 ETH).
    - `Total Fee = 200,000 * 25 Gwei = 5,000,000 Gwei = 0.005 ETH`
2.  **Scenario B (Stablecoin)**: Gas Price is `0.00006 USDC`.
    - `Total Fee = 200,000 * 0.00006 USDC = 12 USDC`

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

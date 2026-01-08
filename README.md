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

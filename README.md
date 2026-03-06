# Railgun Broadcaster Viewer

![Railgun Broadcaster Viewer TUI](example.png)

A powerful, interactive Terminal User Interface (TUI) to monitor Railgun broadcasters on the Waku
network. This tool visualizes real-time data, allowing node operators and developers to track fees,
connectivity, and reliability scores across different chains.

## Features

- **Interactive Dashboard**: Rich TUI built with `Ink` and React.
- **Real-time Monitoring**: Continuously scans the Waku p2p network for broadcasters.
- **Sorting & Filtering**:
  - Sort by any column (Fee, Reliability, Token, etc.).
  - Filter by text (Address, Token).
  - Filter by specific Broadcaster Address.
- **Deep Inspection**: View detailed fees, expiration times, and token support.
- **Log Inspection**: Scrollable, pausable log panel for debugging connection events.
- **Cross-Chain**: Configurable for Ethereum, Polygon, Arbitrum, Sepolia, etc.

## Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/railgun-community/broadcast-viewer.git
    cd broadcast-viewer
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Build**:
    ```bash
    npm run build
    ```

## Quick Start

Start the viewer with a Trusted Fee Signer (required to validate fees against a baseline):

```bash
# Ethereum Mainnet (Default)
npm start -- --signer <TRUSTED_SIGNER_PUBLIC_KEY>

# Ethereum Sepolia (Chain ID: 11155111)
npm start -- --chain-id 11155111 --signer <TRUSTED_SIGNER_PUBLIC_KEY>
```

### Trusted Fee Signers (Community)

You can use these known public keys for testing:

- `0zk1qyjyhqjdkqd9qxusgj092ppxl92plvrk3s3cna9u73h5rwt0ghxvfrv7j6fe3z53l7lrzyqw5te7ku5v8fsrpeadzvpkudgawjv9dg08htj7z3mph5kd6dw50jc`
- `0zk1qyzgh9ctuxm6d06gmax39xutjgrawdsljtv80lqnjtqp3exxayuf0rv7j6fe3z53laetcl9u3cma0q9k4npgy8c8ga4h6mx83v09m8ewctsekw4a079dcl5sw4k`

## Keyboard Controls

| Key                 | Action                                                                       |
| :------------------ | :--------------------------------------------------------------------------- |
| **Navigation**      |                                                                              |
| `Tab` / `Shift+Tab` | Switch focus between panels (Table, Address List, Logs)                      |
| `Up` / `Down`       | Scroll lists or table rows                                                   |
| `PageUp` / `PageDn` | Scroll by page                                                               |
| `Ctrl+u` / `Ctrl+d` | Scroll by half-page                                                          |
| **Table Actions**   |                                                                              |
| `1` - `7`           | Sort by specific column (press again to toggle ASC/DESC)                     |
| `/`                 | **Search Mode**: Type to filter table by text                                |
| **Address List**    |                                                                              |
| `Space`             | Toggle selection of an address (filters table to show only that broadcaster) |
| **Global**          |                                                                              |
| `Esc`               | **Freeze Mode**: Pause all updates to inspect data. Also exits Search Mode.  |
| `Ctrl+c`            | Quit application                                                             |

## Configuration

Options can be passed via CLI flags or a `config.json` file.

| Option           | Description                           | Default        |
| :--------------- | :------------------------------------ | :------------- |
| `--chain-id <n>` | Chain ID to monitor                   | `1` (Ethereum) |
| `--signer <key>` | Trusted Fee Signer Public Key         | (Required)     |
| `--no-signer`    | Run without a Trusted Fee Signer      | `false`        |
| `--refresh <ms>` | Refresh interval in milliseconds      | `10000`        |
| `--debug`        | Enable verbose Waku debugging         | `false`        |
| `--log-to-file`  | Save logs to `broadcaster-viewer.log` | `false`        |

## Understanding the Data

- **Fee**: The cost per unit of gas charged by the broadcaster.
  - _Calculation_: `Fee = (Gas Token Price / Fee Token Price) * (1 + Profit Margin)`
- **Reliability**: Historical uptime/success rate (0-100%).
- **Wallets**: Number of concurrent transactions the broadcaster can process.

## License

MIT

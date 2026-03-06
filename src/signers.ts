export const RAILWAY_SIGNERS = [
  '0zk1qyjyhqjdkqd9qxusgj092ppxl92plvrk3s3cna9u73h5rwt0ghxvfrv7j6fe3z53l7lrzyqw5te7ku5v8fsrpeadzvpkudgawjv9dg08htj7z3mph5kd6dw50jc',
  '0zk1qyzgh9ctuxm6d06gmax39xutjgrawdsljtv80lqnjtqp3exxayuf0rv7j6fe3z53laetcl9u3cma0q9k4npgy8c8ga4h6mx83v09m8ewctsekw4a079dcl5sw4k',
  '0zk1qyqhtwaa9zj3ug9dmxhfedappvm509w7dr5lgadaehxz38w9u457mrv7j6fe3z53layes62mktxj5kd6reh2kxd39ds2gnpf6wphtw39y5g36lsvukeywfqa8y0',
  '0zk1qy88aamk4dp3rn2dvfdu5u8vvtfs89vg8h6zyajr4g5mq0ykm28e0rv7j6fe3z53l7zpahc5w52u8juzg54ypn24slqsyy3dy57s5k3669dyg3jxyp6czxszfs7',
];

export const TERMINAL_SIGNERS = [
  '0zk1qyqhtwaa9zj3ug9dmxhfedappvm509w7dr5lgadaehxz38w9u457mrv7j6fe3z53layes62mktxj5kd6reh2kxd39ds2gnpf6wphtw39y5g36lsvukeywfqa8y0',
  '0zk1qyzgh9ctuxm6d06gmax39xutjgrawdsljtv80lqnjtqp3exxayuf0rv7j6fe3z53laetcl9u3cma0q9k4npgy8c8ga4h6mx83v09m8ewctsekw4a079dcl5sw4k',
  '0zk1qy88aamk4dp3rn2dvfdu5u8vvtfs89vg8h6zyajr4g5mq0ykm28e0rv7j6fe3z53l7zpahc5w52u8juzg54ypn24slqsyy3dy57s5k3669dyg3jxyp6czxszfs7',
];

export type WalletType = 'railway' | 'terminal' | 'both' | 'none';

export const getWalletType = (address: string): WalletType => {
  const isRailway = RAILWAY_SIGNERS.includes(address);
  const isTerminal = TERMINAL_SIGNERS.includes(address);

  if (isRailway && isTerminal) return 'both';
  if (isRailway) return 'railway';
  if (isTerminal) return 'terminal';
  return 'none';
};

export const DEFAULT_STATIC_NODES = [
  '/dns4/relay-a.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x',
  '/dns4/relay-b.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmPtEAoPPok7VLrpNNC6t92ZQFqLndHvkdx6Fk3CxA4MaG',
  '/dns4/client-edge.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmQdCGG5qREQCq96kucmpUVupmvLwrTRjMazPAaMTNP97A',
  '/dns4/relay-a.rootedinprivacy.com/tcp/30304/p2p/16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x',
  '/dns4/relay-b.rootedinprivacy.com/tcp/30304/p2p/16Uiu2HAmPtEAoPPok7VLrpNNC6t92ZQFqLndHvkdx6Fk3CxA4MaG',
  '/dns4/client-edge.rootedinprivacy.com/tcp/30304/p2p/16Uiu2HAmQdCGG5qREQCq96kucmpUVupmvLwrTRjMazPAaMTNP97A',
] as const;

export const EXTENDED_STATIC_NODES = [
  '/dns4/waku1.privatepaymaster.com/tcp/30000/p2p/16Uiu2HAkypTi3rsec2pkht6vUGTQHr2fkMjsACwM5hpEqEnrcyvE',
  '/dns4/waku1.privatepaymaster.com/tcp/443/wss/p2p/16Uiu2HAkypTi3rsec2pkht6vUGTQHr2fkMjsACwM5hpEqEnrcyvE',
  '/dns4/waku2.privatepaymaster.com/tcp/30000/p2p/16Uiu2HAmSbCr93dtYB3hAckmXKd3B5Qo7S9YoSri3exjLhGYBWfd',
  '/dns4/waku2.privatepaymaster.com/tcp/443/wss/p2p/16Uiu2HAmSbCr93dtYB3hAckmXKd3B5Qo7S9YoSri3exjLhGYBWfd',
] as const;

export const COMBINED_EXTENDED_STATIC_NODES = [...DEFAULT_STATIC_NODES, ...EXTENDED_STATIC_NODES];

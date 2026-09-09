import dotenv from 'dotenv';
dotenv.config();

export interface OracleConfig {
  port: number;
  transport: 'stdio' | 'sse';
  network: 'testnet' | 'pubnet';
  merchantAddress: string;
  usdcToken: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  prices: {
    dexPrice: string;
    sorobanTvl: string;
    swapRoute: string;
  };
}

export const defaultConfig: OracleConfig = {
  port: parseInt(process.env.ORACLE_PORT || '4020', 10),
  transport: (process.env.ORACLE_TRANSPORT as 'stdio' | 'sse') || 'stdio',
  network: (process.env.STELLAR_NETWORK as 'testnet' | 'pubnet') || 'testnet',
  merchantAddress:
    process.env.ORACLE_MERCHANT_ADDRESS ||
    'GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT',
  usdcToken:
    process.env.ORACLE_USDC_TOKEN ||
    'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USSTHZX5ACUSDC',
  horizonUrl:
    process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl:
    process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  prices: {
    dexPrice: process.env.PRICE_DEX_PRICE || '0.01',
    sorobanTvl: process.env.PRICE_SOROBAN_TVL || '0.02',
    swapRoute: process.env.PRICE_SWAP_ROUTE || '0.01',
  },
};

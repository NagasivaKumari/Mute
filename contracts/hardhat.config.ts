import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    flareTestnet: {
      url: process.env.FLARE_RPC_URL ?? 'https://coston2-api.flare.network/ext/C/rpc',
      chainId: 114,
      accounts: process.env.FLARE_PRIVATE_KEY ? [process.env.FLARE_PRIVATE_KEY] : [],
    },
  },
};

export default config;

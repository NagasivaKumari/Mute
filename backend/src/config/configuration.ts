export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  flare: {
    rpcUrl:
      process.env.FLARE_RPC_URL ?? 'https://coston2-api.flare.network/ext/C/rpc',
    chainId: parseInt(process.env.FLARE_CHAIN_ID ?? '114', 10),
    privateKey: process.env.FLARE_PRIVATE_KEY,
    contracts: {
      organizationRegistry: process.env.ORG_REGISTRY_ADDRESS,
      policyRegistry: process.env.POLICY_REGISTRY_ADDRESS,
      approvalRegistry: process.env.APPROVAL_REGISTRY_ADDRESS,
      auditRegistry: process.env.AUDIT_REGISTRY_ADDRESS,
      attestationRegistry: process.env.ATTESTATION_REGISTRY_ADDRESS,
    },
  },
  fce: {
    url: process.env.FCE_URL ?? 'http://localhost:6674',
    timeout: parseInt(process.env.FCE_TIMEOUT ?? '5000', 10),
    extensionId: process.env.FCE_EXTENSION_ID,
    senderContractAddress: process.env.FCE_SENDER_CONTRACT_ADDRESS,
    teeExtensionRegistry: process.env.TEE_EXTENSION_REGISTRY,
    teeMachineRegistry: process.env.TEE_MACHINE_REGISTRY,
    pollInterval: parseInt(process.env.FCE_POLL_INTERVAL ?? '2000', 10),
    pollTimeout: parseInt(process.env.FCE_POLL_TIMEOUT ?? '60000', 10),
    txValue: parseInt(process.env.FCE_TX_VALUE ?? '1', 10),
  },
});

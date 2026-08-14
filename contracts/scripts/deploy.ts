import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // 1. OrganizationRegistry
  const OrgRegistry = await ethers.getContractFactory('OrganizationRegistry');
  const orgRegistry = await OrgRegistry.deploy();
  await orgRegistry.waitForDeployment();
  const orgAddr = await orgRegistry.getAddress();
  console.log(`OrganizationRegistry deployed: ${orgAddr}`);

  // 2. PolicyRegistry
  const PolicyRegistry = await ethers.getContractFactory('PolicyRegistry');
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  const policyAddr = await policyRegistry.getAddress();
  console.log(`PolicyRegistry deployed: ${policyAddr}`);

  // 3. ApprovalRegistry
  const ApprovalRegistry = await ethers.getContractFactory('ApprovalRegistry');
  const approvalRegistry = await ApprovalRegistry.deploy();
  await approvalRegistry.waitForDeployment();
  const approvalAddr = await approvalRegistry.getAddress();
  console.log(`ApprovalRegistry deployed: ${approvalAddr}`);

  // 4. AuditRegistry
  const AuditRegistry = await ethers.getContractFactory('AuditRegistry');
  const auditRegistry = await AuditRegistry.deploy();
  await auditRegistry.waitForDeployment();
  const auditAddr = await auditRegistry.getAddress();
  console.log(`AuditRegistry deployed: ${auditAddr}`);

  // 5. AttestationRegistry
  const AttestationRegistry = await ethers.getContractFactory('AttestationRegistry');
  const attestationRegistry = await AttestationRegistry.deploy();
  await attestationRegistry.waitForDeployment();
  const attAddr = await attestationRegistry.getAddress();
  console.log(`AttestationRegistry deployed: ${attAddr}`);

  // Summary
  console.log('\n--- Deployment Summary ---');
  console.log('Network: Flare Testnet (Coston2)');
  console.log(`Deployer: ${deployer.address}`);
  console.log('');
  console.log('Contract Addresses:');
  console.log(`  ORG_REGISTRY_ADDRESS=${orgAddr}`);
  console.log(`  POLICY_REGISTRY_ADDRESS=${policyAddr}`);
  console.log(`  APPROVAL_REGISTRY_ADDRESS=${approvalAddr}`);
  console.log(`  AUDIT_REGISTRY_ADDRESS=${auditAddr}`);
  console.log(`  ATTESTATION_REGISTRY_ADDRESS=${attAddr}`);
  console.log('');
  console.log('Add these to your .env file');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

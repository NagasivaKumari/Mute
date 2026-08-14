import { expect } from "chai";
import { ethers } from "hardhat";
import { PolicyRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PolicyRegistry", function () {
  let registry: PolicyRegistry;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const orgId = ethers.encodeBytes32String("org-001");
  const policyId = ethers.encodeBytes32String("policy-001");
  const hash1 = ethers.keccak256(ethers.toUtf8Bytes("v1"));
  const hash2 = ethers.keccak256(ethers.toUtf8Bytes("v2"));

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PolicyRegistry");
    registry = await Factory.deploy();
  });

  // ─────── registerPolicy ───────

  describe("registerPolicy", function () {
    it("registers a policy version", async function () {
      await expect(registry.registerPolicy(orgId, policyId, hash1, 1))
        .to.emit(registry, "PolicyRegistered")
        .withArgs(orgId, policyId, hash1, 1, (v: bigint) => v > 0n);

      const rec = await registry.getPolicy(orgId, policyId, 1);
      expect(rec.policyHash).to.equal(hash1);
      expect(rec.version).to.equal(1n);
      expect(rec.active).to.be.true;
    });

    it("reverts on zero hash", async function () {
      await expect(
        registry.registerPolicy(orgId, policyId, ethers.ZeroHash, 1)
      ).to.be.revertedWithCustomError(registry, "ZeroHash");
    });

    it("reverts on zero version", async function () {
      await expect(
        registry.registerPolicy(orgId, policyId, hash1, 0)
      ).to.be.revertedWithCustomError(registry, "ZeroVersion");
    });

    it("reverts if version not newer", async function () {
      await registry.registerPolicy(orgId, policyId, hash1, 2);
      await expect(
        registry.registerPolicy(orgId, policyId, hash2, 1)
      ).to.be.revertedWithCustomError(registry, "VersionNotNewer");
      await expect(
        registry.registerPolicy(orgId, policyId, hash2, 2)
      ).to.be.revertedWithCustomError(registry, "VersionNotNewer");
    });

    it("reverts for non-owner", async function () {
      await expect(
        registry.connect(user).registerPolicy(orgId, policyId, hash1, 1)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ─────── updatePolicy (alias) ───────

  describe("updatePolicy", function () {
    it("works as alias for registerPolicy", async function () {
      await expect(registry.updatePolicy(orgId, policyId, hash1, 1))
        .to.emit(registry, "PolicyRegistered");
    });
  });

  // ─────── disablePolicy ───────

  describe("disablePolicy", function () {
    beforeEach(async function () {
      await registry.registerPolicy(orgId, policyId, hash1, 1);
    });

    it("disables the latest version", async function () {
      await expect(registry.disablePolicy(orgId, policyId))
        .to.emit(registry, "PolicyDisabled")
        .withArgs(orgId, policyId);

      const rec = await registry.getPolicy(orgId, policyId, 1);
      expect(rec.active).to.be.false;
    });

    it("reverts if not found", async function () {
      const fakePolicy = ethers.encodeBytes32String("nope");
      await expect(
        registry.disablePolicy(orgId, fakePolicy)
      ).to.be.revertedWithCustomError(registry, "NotFound");
    });

    it("reverts if already inactive", async function () {
      await registry.disablePolicy(orgId, policyId);
      await expect(
        registry.disablePolicy(orgId, policyId)
      ).to.be.revertedWithCustomError(registry, "NotActive");
    });
  });

  // ─────── getLatestPolicy ───────

  describe("getLatestPolicy", function () {
    it("returns the latest version", async function () {
      await registry.registerPolicy(orgId, policyId, hash1, 1);
      await registry.registerPolicy(orgId, policyId, hash2, 2);

      const [rec, ver] = await registry.getLatestPolicy(orgId, policyId);
      expect(ver).to.equal(2n);
      expect(rec.policyHash).to.equal(hash2);
    });
  });

  // ─────── verifyPolicyHash ───────

  describe("verifyPolicyHash", function () {
    it("returns true for matching hash", async function () {
      await registry.registerPolicy(orgId, policyId, hash1, 1);
      expect(await registry.verifyPolicyHash(orgId, policyId, hash1)).to.be.true;
    });

    it("returns false for non-matching hash", async function () {
      await registry.registerPolicy(orgId, policyId, hash1, 1);
      expect(await registry.verifyPolicyHash(orgId, policyId, hash2)).to.be.false;
    });

    it("returns false for nonexistent policy", async function () {
      expect(await registry.verifyPolicyHash(orgId, policyId, hash1)).to.be.false;
    });
  });
});

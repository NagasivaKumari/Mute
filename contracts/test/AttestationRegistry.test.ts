import { expect } from "chai";
import { ethers } from "hardhat";
import { AttestationRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AttestationRegistry", function () {
  let registry: AttestationRegistry;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const attId = ethers.encodeBytes32String("att-001");
  const runtimeHash = ethers.keccak256(ethers.toUtf8Bytes("runtime"));
  const policyHash = ethers.keccak256(ethers.toUtf8Bytes("policy"));
  const extensionHash = ethers.keccak256(ethers.toUtf8Bytes("extension"));
  const cliHash = ethers.keccak256(ethers.toUtf8Bytes("cli"));

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AttestationRegistry");
    registry = await Factory.deploy();
  });

  // ─────── registerAttestation ───────

  describe("registerAttestation", function () {
    it("registers an attestation", async function () {
      await expect(
        registry.registerAttestation(attId, runtimeHash, policyHash, extensionHash, cliHash)
      )
        .to.emit(registry, "AttestationRegistered")
        .withArgs(attId, runtimeHash, policyHash, extensionHash, cliHash, (v: bigint) => v > 0n);

      const att = await registry.getAttestation(attId);
      expect(att.runtimeHash).to.equal(runtimeHash);
      expect(att.policyHash).to.equal(policyHash);
      expect(att.extensionHash).to.equal(extensionHash);
      expect(att.cliHash).to.equal(cliHash);
    });

    it("reverts on zero runtimeHash", async function () {
      await expect(
        registry.registerAttestation(attId, ethers.ZeroHash, policyHash, extensionHash, cliHash)
      ).to.be.revertedWithCustomError(registry, "ZeroHash");
    });

    it("reverts on duplicate", async function () {
      await registry.registerAttestation(attId, runtimeHash, policyHash, extensionHash, cliHash);
      await expect(
        registry.registerAttestation(attId, runtimeHash, policyHash, extensionHash, cliHash)
      ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
    });

    it("reverts for non-owner", async function () {
      await expect(
        registry.connect(user).registerAttestation(attId, runtimeHash, policyHash, extensionHash, cliHash)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ─────── verifyAttestation ───────

  describe("verifyAttestation", function () {
    it("returns true when registered", async function () {
      await registry.registerAttestation(attId, runtimeHash, policyHash, extensionHash, cliHash);
      expect(await registry.verifyAttestation(attId)).to.be.true;
    });

    it("returns false when missing", async function () {
      expect(await registry.verifyAttestation(attId)).to.be.false;
    });
  });

  // ─────── getAttestation ───────

  describe("getAttestation", function () {
    it("returns empty record for unknown id", async function () {
      const att = await registry.getAttestation(attId);
      expect(att.timestamp).to.equal(0n);
    });
  });
});

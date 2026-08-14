import { expect } from "chai";
import { ethers } from "hardhat";
import { AuditRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AuditRegistry", function () {
  let registry: AuditRegistry;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const auditHash = ethers.keccak256(ethers.toUtf8Bytes("audit-log-1"));
  const orgId = ethers.encodeBytes32String("org-001");
  const projectId = ethers.encodeBytes32String("proj-001");
  const sessionId = ethers.encodeBytes32String("sess-001");
  const actionType = ethers.encodeBytes32String("deploy");

  const auditHash2 = ethers.keccak256(ethers.toUtf8Bytes("audit-log-2"));
  const sessionId2 = ethers.encodeBytes32String("sess-002");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AuditRegistry");
    registry = await Factory.deploy();
  });

  // ─────── recordAudit ───────

  describe("recordAudit", function () {
    it("records an audit", async function () {
      await expect(
        registry.recordAudit(auditHash, orgId, projectId, sessionId, actionType)
      )
        .to.emit(registry, "AuditRecorded")
        .withArgs(auditHash, orgId, sessionId, actionType, (v: bigint) => v > 0n);

      const rec = await registry.getAudit(auditHash);
      expect(rec.auditHash).to.equal(auditHash);
      expect(rec.organizationId).to.equal(orgId);
      expect(rec.projectId).to.equal(projectId);
      expect(rec.sessionId).to.equal(sessionId);
      expect(rec.actionType).to.equal(actionType);
    });

    it("reverts on duplicate hash", async function () {
      await registry.recordAudit(auditHash, orgId, projectId, sessionId, actionType);
      await expect(
        registry.recordAudit(auditHash, orgId, projectId, sessionId, actionType)
      ).to.be.revertedWithCustomError(registry, "AlreadyRecorded");
    });

    it("reverts for non-owner", async function () {
      await expect(
        registry.connect(user).recordAudit(auditHash, orgId, projectId, sessionId, actionType)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ─────── verifyAudit ───────

  describe("verifyAudit", function () {
    it("returns true when recorded", async function () {
      await registry.recordAudit(auditHash, orgId, projectId, sessionId, actionType);
      expect(await registry.verifyAudit(auditHash)).to.be.true;
    });

    it("returns false when missing", async function () {
      expect(await registry.verifyAudit(auditHash)).to.be.false;
    });
  });

  // ─────── getAudit ───────

  describe("getAudit", function () {
    it("returns empty record for unknown hash", async function () {
      const rec = await registry.getAudit(auditHash);
      expect(rec.timestamp).to.equal(0n);
    });
  });

  // ─────── getSessionAudits ───────

  describe("getSessionAudits", function () {
    it("returns audit hashes for a session", async function () {
      await registry.recordAudit(auditHash, orgId, projectId, sessionId, actionType);
      await registry.recordAudit(auditHash2, orgId, projectId, sessionId, actionType);

      const hashes = await registry.getSessionAudits(sessionId);
      expect(hashes.length).to.equal(2);
      expect(hashes[0]).to.equal(auditHash);
      expect(hashes[1]).to.equal(auditHash2);
    });

    it("returns empty array for unknown session", async function () {
      const hashes = await registry.getSessionAudits(sessionId2);
      expect(hashes.length).to.equal(0);
    });
  });
});

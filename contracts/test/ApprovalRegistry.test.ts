import { expect } from "chai";
import { ethers } from "hardhat";
import { ApprovalRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ApprovalRegistry", function () {
  let registry: ApprovalRegistry;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const approvalId = ethers.encodeBytes32String("approval-001");
  const sessionId = ethers.encodeBytes32String("session-001");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ApprovalRegistry");
    registry = await Factory.deploy();
  });

  // ─────── recordApproval ───────

  describe("recordApproval", function () {
    it("records an approval", async function () {
      await expect(
        registry.recordApproval(approvalId, sessionId, user.address, true, "Looks good")
      )
        .to.emit(registry, "ApprovalRecorded")
        .withArgs(approvalId, sessionId, user.address, true, (v: bigint) => v > 0n);

      const rec = await registry.getApproval(approvalId);
      expect(rec.approver).to.equal(user.address);
      expect(rec.approved).to.be.true;
      expect(rec.reason).to.equal("Looks good");
      expect(rec.sessionId).to.equal(sessionId);
    });

    it("reverts on duplicate", async function () {
      await registry.recordApproval(approvalId, sessionId, user.address, true, "ok");
      await expect(
        registry.recordApproval(approvalId, sessionId, user.address, true, "ok")
      ).to.be.revertedWithCustomError(registry, "AlreadyRecorded");
    });

    it("reverts for non-owner", async function () {
      await expect(
        registry.connect(user).recordApproval(approvalId, sessionId, user.address, true, "ok")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ─────── updateApproval ───────

  describe("updateApproval", function () {
    beforeEach(async function () {
      await registry.recordApproval(approvalId, sessionId, user.address, true, "initial");
    });

    it("updates an existing record", async function () {
      await expect(registry.updateApproval(approvalId, false, "changed mind"))
        .to.emit(registry, "ApprovalUpdated")
        .withArgs(approvalId, false, (v: bigint) => v > 0n);

      const rec = await registry.getApproval(approvalId);
      expect(rec.approved).to.be.false;
      expect(rec.reason).to.equal("changed mind");
    });

    it("reverts if not found", async function () {
      const fake = ethers.encodeBytes32String("fake");
      await expect(
        registry.updateApproval(fake, false, "nope")
      ).to.be.revertedWithCustomError(registry, "NotFound");
    });
  });

  // ─────── verifyApproval ───────

  describe("verifyApproval", function () {
    it("returns true when recorded", async function () {
      await registry.recordApproval(approvalId, sessionId, user.address, true, "ok");
      expect(await registry.verifyApproval(approvalId)).to.be.true;
    });

    it("returns false when missing", async function () {
      expect(await registry.verifyApproval(approvalId)).to.be.false;
    });
  });
});

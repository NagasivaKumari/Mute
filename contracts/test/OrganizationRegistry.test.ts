import { expect } from "chai";
import { ethers } from "hardhat";
import { OrganizationRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("OrganizationRegistry", function () {
  let registry: OrganizationRegistry;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const orgId = ethers.encodeBytes32String("org-001");
  const orgId2 = ethers.encodeBytes32String("org-002");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("OrganizationRegistry");
    registry = await Factory.deploy();
  });

  // ─────── createOrganization ───────

  describe("createOrganization", function () {
    it("creates an organization", async function () {
      await expect(registry.createOrganization(orgId, user.address, "Sentinel"))
        .to.emit(registry, "OrganizationCreated")
        .withArgs(orgId, user.address, "Sentinel", (v: bigint) => v > 0n);

      const org = await registry.getOrganization(orgId);
      expect(org.orgId).to.equal(orgId);
      expect(org.owner).to.equal(user.address);
      expect(org.name).to.equal("Sentinel");
      expect(org.active).to.be.true;
    });

    it("reverts on zero address", async function () {
      await expect(
        registry.createOrganization(orgId, ethers.ZeroAddress, "Test")
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("reverts on empty name", async function () {
      await expect(
        registry.createOrganization(orgId, user.address, "")
      ).to.be.revertedWithCustomError(registry, "EmptyName");
    });

    it("reverts on duplicate id", async function () {
      await registry.createOrganization(orgId, user.address, "Test");
      await expect(
        registry.createOrganization(orgId, user.address, "Test")
      ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
    });

    it("reverts for non-owner", async function () {
      await expect(
        registry.connect(user).createOrganization(orgId, user.address, "Test")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ─────── updateOrganization ───────

  describe("updateOrganization", function () {
    beforeEach(async function () {
      await registry.createOrganization(orgId, user.address, "Old Name");
    });

    it("updates the name", async function () {
      await expect(registry.updateOrganization(orgId, "New Name"))
        .to.emit(registry, "OrganizationUpdated")
        .withArgs(orgId, "New Name");

      const org = await registry.getOrganization(orgId);
      expect(org.name).to.equal("New Name");
    });

    it("reverts if not found", async function () {
      await expect(
        registry.updateOrganization(orgId2, "Name")
      ).to.be.revertedWithCustomError(registry, "NotFound");
    });

    it("reverts if inactive", async function () {
      await registry.deactivateOrganization(orgId);
      await expect(
        registry.updateOrganization(orgId, "Name")
      ).to.be.revertedWithCustomError(registry, "NotActive");
    });
  });

  // ─────── deactivateOrganization ───────

  describe("deactivateOrganization", function () {
    beforeEach(async function () {
      await registry.createOrganization(orgId, user.address, "Test");
    });

    it("deactivates", async function () {
      await expect(registry.deactivateOrganization(orgId))
        .to.emit(registry, "OrganizationDeactivated")
        .withArgs(orgId);

      const org = await registry.getOrganization(orgId);
      expect(org.active).to.be.false;
    });

    it("reverts if not found", async function () {
      await expect(
        registry.deactivateOrganization(orgId2)
      ).to.be.revertedWithCustomError(registry, "NotFound");
    });

    it("reverts if already inactive", async function () {
      await registry.deactivateOrganization(orgId);
      await expect(
        registry.deactivateOrganization(orgId)
      ).to.be.revertedWithCustomError(registry, "NotActive");
    });
  });

  // ─────── getOrganizationByOwner ───────

  describe("getOrganizationByOwner", function () {
    it("returns the org id for a given owner", async function () {
      await registry.createOrganization(orgId, user.address, "Test");
      expect(await registry.getOrganizationByOwner(user.address)).to.equal(orgId);
    });

    it("returns zero bytes32 for unknown owner", async function () {
      expect(await registry.getOrganizationByOwner(user.address)).to.equal(ethers.ZeroHash);
    });
  });
});

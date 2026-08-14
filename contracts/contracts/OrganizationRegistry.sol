// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title OrganizationRegistry
/// @notice On-chain registry for Sentinel organizations. Stores id, owner, name, and active status.
/// @dev All state changes restricted to owner. Business logic stays in the NestJS backend.
contract OrganizationRegistry is Ownable {
    // ──────────────────────────── Errors ────────────────────────────

    error ZeroAddress();
    error EmptyName();
    error AlreadyRegistered();
    error NotFound();
    error NotActive();

    // ──────────────────────────── Events ────────────────────────────

    event OrganizationCreated(
        bytes32 indexed orgId,
        address indexed owner,
        string name,
        uint256 createdAt
    );
    event OrganizationUpdated(
        bytes32 indexed orgId,
        string name
    );
    event OrganizationDeactivated(bytes32 indexed orgId);
    event OrganizationOwnerUpdated(
        bytes32 indexed orgId,
        address indexed newOwner
    );
    event OrganizationOwnerRevoked(bytes32 indexed orgId);

    // ──────────────────────────── Structs ───────────────────────────

    struct Organization {
        bytes32 orgId;
        address owner;
        string name;
        uint256 createdAt;
        bool active;
    }

    // ──────────────────────────── Storage ───────────────────────────

    /// @dev orgId => Organization
    mapping(bytes32 => Organization) private _organizations;

    /// @dev owner address => orgId (one org per owner)
    mapping(address => bytes32) private _orgByOwner;

    // ──────────────────────────── Constructor ───────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────── State-Changing ────────────────────────

    /// @notice Register a new organization.
    /// @param orgId    Unique identifier (backend-generated).
    /// @param orgOwner Owner address.
    /// @param name     Human-readable name.
    function createOrganization(
        bytes32 orgId,
        address orgOwner,
        string calldata name
    ) external onlyOwner {
        if (orgOwner == address(0)) revert ZeroAddress();
        if (_organizations[orgId].createdAt != 0) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert EmptyName();

        _organizations[orgId] = Organization({
            orgId: orgId,
            owner: orgOwner,
            name: name,
            createdAt: block.timestamp,
            active: true
        });

        _orgByOwner[orgOwner] = orgId;

        emit OrganizationCreated(orgId, orgOwner, name, block.timestamp);
    }

    /// @notice Update an organization's name.
    /// @param orgId   Organization to update.
    /// @param newName New name.
    function updateOrganization(
        bytes32 orgId,
        string calldata newName
    ) external onlyOwner {
        Organization storage org = _organizations[orgId];
        if (org.createdAt == 0) revert NotFound();
        if (!org.active) revert NotActive();

        org.name = newName;

        emit OrganizationUpdated(orgId, newName);
    }

    /// @notice Deactivate an organization.
    /// @param orgId Organization to deactivate.
    function deactivateOrganization(bytes32 orgId) external onlyOwner {
        Organization storage org = _organizations[orgId];
        if (org.createdAt == 0) revert NotFound();
        if (!org.active) revert NotActive();

        org.active = false;

        emit OrganizationDeactivated(orgId);
    }

    /// @notice Transfer on-chain ownership to an organization's linked Flare wallet.
    /// @param orgId    Organization to update.
    /// @param newOwner Linked wallet address (organization's blockchain identity).
    function updateOrganizationOwner(
        bytes32 orgId,
        address newOwner
    ) external onlyOwner {
        Organization storage org = _organizations[orgId];
        if (org.createdAt == 0) revert NotFound();
        if (!org.active) revert NotActive();
        if (newOwner == address(0)) revert ZeroAddress();

        delete _orgByOwner[org.owner];
        org.owner = newOwner;
        _orgByOwner[newOwner] = orgId;

        emit OrganizationOwnerUpdated(orgId, newOwner);
    }

    /// @notice Revoke on-chain ownership (wallet disconnected or rotated away).
    /// @param orgId Organization to update.
    function revokeOrganizationOwner(bytes32 orgId) external onlyOwner {
        Organization storage org = _organizations[orgId];
        if (org.createdAt == 0) revert NotFound();

        delete _orgByOwner[org.owner];
        org.owner = address(0);

        emit OrganizationOwnerRevoked(orgId);
    }

    // ──────────────────────── Views ─────────────────────────────────

    /// @notice Get an organization by its id.
    /// @param orgId Organization id.
    /// @return org Organization data.
    function getOrganization(bytes32 orgId) external view returns (Organization memory org) {
        org = _organizations[orgId];
    }

    /// @notice Get the organization id for a given owner address.
    /// @param orgOwner Owner address.
    /// @return orgId The organization id, or bytes32(0) if none.
    function getOrganizationByOwner(address orgOwner) external view returns (bytes32) {
        return _orgByOwner[orgOwner];
    }
}

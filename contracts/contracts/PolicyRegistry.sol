// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PolicyRegistry
/// @notice On-chain registry for Sentinel policy hashes. Never stores policy JSON.
/// @dev Supports versioned policies with active/inactive status. One policyHash per version.
contract PolicyRegistry is Ownable {
    // ──────────────────────────── Errors ────────────────────────────

    error ZeroHash();
    error ZeroVersion();
    error NotFound();
    error NotActive();
    error VersionNotNewer();

    // ──────────────────────────── Events ────────────────────────────

    event PolicyRegistered(
        bytes32 indexed organizationId,
        bytes32 indexed policyId,
        bytes32 policyHash,
        uint256 version,
        uint256 createdAt
    );
    event PolicyUpdated(
        bytes32 indexed organizationId,
        bytes32 indexed policyId,
        bytes32 policyHash,
        uint256 version,
        uint256 createdAt
    );
    event PolicyDisabled(
        bytes32 indexed organizationId,
        bytes32 indexed policyId
    );

    // ──────────────────────────── Structs ───────────────────────────

    struct PolicyRecord {
        bytes32 organizationId;
        bytes32 policyId;
        bytes32 policyHash;
        uint256 version;
        uint256 createdAt;
        bool active;
    }

    // ──────────────────────────── Storage ───────────────────────────

    /// @dev organizationId => policyId => version => PolicyRecord
    mapping(bytes32 => mapping(bytes32 => mapping(uint256 => PolicyRecord))) private _policies;

    /// @dev organizationId => policyId => latest version number
    mapping(bytes32 => mapping(bytes32 => uint256)) private _latestVersion;

    // ──────────────────────────── Constructor ───────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────── State-Changing ────────────────────────

    /// @notice Register a new policy or a new version of an existing policy.
    /// @param organizationId Owning organization.
    /// @param policyId       Unique policy identifier within the org.
    /// @param policyHash     Hash of the policy document (e.g. SHA-256).
    /// @param version        Version number (must be > latest).
    function registerPolicy(
        bytes32 organizationId,
        bytes32 policyId,
        bytes32 policyHash,
        uint256 version
    ) external onlyOwner {
        if (policyHash == bytes32(0)) revert ZeroHash();
        if (version == 0) revert ZeroVersion();

        uint256 latest = _latestVersion[organizationId][policyId];
        if (version <= latest) revert VersionNotNewer();

        _policies[organizationId][policyId][version] = PolicyRecord({
            organizationId: organizationId,
            policyId: policyId,
            policyHash: policyHash,
            version: version,
            createdAt: block.timestamp,
            active: true
        });

        _latestVersion[organizationId][policyId] = version;

        emit PolicyRegistered(organizationId, policyId, policyHash, version, block.timestamp);
    }

    /// @notice Alias — same as registerPolicy. Named for backend compatibility.
    function updatePolicy(
        bytes32 organizationId,
        bytes32 policyId,
        bytes32 policyHash,
        uint256 version
    ) external onlyOwner {
        // ponytail: delegates to registerPolicy to avoid duplicate logic
        this.registerPolicy(organizationId, policyId, policyHash, version);
    }

    /// @notice Disable the latest version of a policy.
    /// @param organizationId Owning organization.
    /// @param policyId       Policy to disable.
    function disablePolicy(
        bytes32 organizationId,
        bytes32 policyId
    ) external onlyOwner {
        uint256 latest = _latestVersion[organizationId][policyId];
        if (latest == 0) revert NotFound();

        PolicyRecord storage rec = _policies[organizationId][policyId][latest];
        if (!rec.active) revert NotActive();

        rec.active = false;

        emit PolicyDisabled(organizationId, policyId);
    }

    // ──────────────────────── Views ─────────────────────────────────

    /// @notice Get a specific version of a policy.
    /// @return record The policy record.
    function getPolicy(
        bytes32 organizationId,
        bytes32 policyId,
        uint256 version
    ) external view returns (PolicyRecord memory record) {
        record = _policies[organizationId][policyId][version];
    }

    /// @notice Get the latest version of a policy.
    /// @return record The policy record.
    /// @return version The latest version number.
    function getLatestPolicy(
        bytes32 organizationId,
        bytes32 policyId
    ) external view returns (PolicyRecord memory record, uint256 version) {
        version = _latestVersion[organizationId][policyId];
        record = _policies[organizationId][policyId][version];
    }

    /// @notice Check whether a policy hash matches the latest registered version.
    /// @return True if the hash matches and the policy exists.
    function verifyPolicyHash(
        bytes32 organizationId,
        bytes32 policyId,
        bytes32 expectedHash
    ) external view returns (bool) {
        uint256 latest = _latestVersion[organizationId][policyId];
        if (latest == 0) return false;

        PolicyRecord memory rec = _policies[organizationId][policyId][latest];
        return rec.policyHash == expectedHash;
    }
}

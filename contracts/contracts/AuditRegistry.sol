// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AuditRegistry
/// @notice Immutable on-chain store for Sentinel audit hashes. Never stores complete logs.
/// @dev Keyed by auditHash (the immutable proof). Business logic stays in backend.
contract AuditRegistry is Ownable {
    // ──────────────────────────── Errors ────────────────────────────

    error AlreadyRecorded();
    error NotFound();

    // ──────────────────────────── Events ────────────────────────────

    event AuditRecorded(
        bytes32 indexed auditHash,
        bytes32 indexed organizationId,
        bytes32 sessionId,
        bytes32 actionType,
        uint256 timestamp
    );

    // ──────────────────────────── Structs ───────────────────────────

    struct AuditRecord {
        bytes32 auditHash;
        bytes32 organizationId;
        bytes32 projectId;
        bytes32 sessionId;
        bytes32 actionType;
        uint256 timestamp;
    }

    // ──────────────────────────── Storage ───────────────────────────

    /// @dev auditHash => AuditRecord
    mapping(bytes32 => AuditRecord) private _audits;

    /// @dev sessionId => audit hashes recorded for that session
    mapping(bytes32 => bytes32[]) private _sessionAudits;

    // ──────────────────────────── Constructor ───────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────── State-Changing ────────────────────────

    /// @notice Record an immutable audit hash.
    /// @param auditHash     Unique hash of the audit log (SHA-256 of the full log).
    /// @param organizationId Owning organization.
    /// @param projectId     Project scope of the audit.
    /// @param sessionId     Runtime session this audit belongs to.
    /// @param actionType    Category of action audited (e.g. "deployment", "access").
    function recordAudit(
        bytes32 auditHash,
        bytes32 organizationId,
        bytes32 projectId,
        bytes32 sessionId,
        bytes32 actionType
    ) external onlyOwner {
        if (_audits[auditHash].timestamp != 0) revert AlreadyRecorded();

        _audits[auditHash] = AuditRecord({
            auditHash: auditHash,
            organizationId: organizationId,
            projectId: projectId,
            sessionId: sessionId,
            actionType: actionType,
            timestamp: block.timestamp
        });

        _sessionAudits[sessionId].push(auditHash);

        emit AuditRecorded(auditHash, organizationId, sessionId, actionType, block.timestamp);
    }

    // ──────────────────────── Views ─────────────────────────────────

    /// @notice Verify whether an audit hash has been recorded.
    /// @param auditHash Hash to check.
    /// @return True if recorded (timestamp != 0).
    function verifyAudit(bytes32 auditHash) external view returns (bool) {
        return _audits[auditHash].timestamp != 0;
    }

    /// @notice Get the full audit record for a given hash.
    /// @param auditHash Hash to look up.
    /// @return record The audit data.
    function getAudit(bytes32 auditHash) external view returns (AuditRecord memory record) {
        record = _audits[auditHash];
    }

    /// @notice Get all audit hashes recorded for a session.
    /// @param sessionId Session to query.
    /// @return hashes Array of audit hashes.
    function getSessionAudits(bytes32 sessionId) external view returns (bytes32[] memory hashes) {
        hashes = _sessionAudits[sessionId];
    }
}

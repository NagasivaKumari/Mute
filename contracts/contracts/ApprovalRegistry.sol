// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ApprovalRegistry
/// @notice On-chain registry for Sentinel approval decisions.
/// @dev Stores approval records linked to sessions. Business logic stays in backend.
contract ApprovalRegistry is Ownable {
    // ──────────────────────────── Errors ────────────────────────────

    error AlreadyRecorded();
    error NotFound();

    // ──────────────────────────── Events ────────────────────────────

    event ApprovalRecorded(
        bytes32 indexed approvalId,
        bytes32 indexed sessionId,
        address indexed approver,
        bool approved,
        uint256 timestamp
    );
    event ApprovalUpdated(
        bytes32 indexed approvalId,
        bool approved,
        uint256 timestamp
    );

    // ──────────────────────────── Structs ───────────────────────────

    struct ApprovalRecord {
        bytes32 approvalId;
        bytes32 sessionId;
        address approver;
        bool approved;
        string reason;
        uint256 timestamp;
    }

    // ──────────────────────────── Storage ───────────────────────────

    /// @dev approvalId => ApprovalRecord
    mapping(bytes32 => ApprovalRecord) private _approvals;

    // ──────────────────────────── Constructor ───────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────── State-Changing ────────────────────────

    /// @notice Record an approval decision.
    /// @param approvalId Unique identifier (backend-generated).
    /// @param sessionId  Session this approval belongs to.
    /// @param approver   Address of the approver.
    /// @param approved   Decision: true = approved, false = rejected.
    /// @param reason     Human-readable reason (off-chain text hash or short reason).
    function recordApproval(
        bytes32 approvalId,
        bytes32 sessionId,
        address approver,
        bool approved,
        string calldata reason
    ) external onlyOwner {
        if (_approvals[approvalId].timestamp != 0) revert AlreadyRecorded();

        _approvals[approvalId] = ApprovalRecord({
            approvalId: approvalId,
            sessionId: sessionId,
            approver: approver,
            approved: approved,
            reason: reason,
            timestamp: block.timestamp
        });

        emit ApprovalRecorded(approvalId, sessionId, approver, approved, block.timestamp);
    }

    /// @notice Update an existing approval decision (e.g. escalation).
    /// @param approvalId Existing approval to update.
    /// @param approved   New decision.
    /// @param reason     New reason.
    function updateApproval(
        bytes32 approvalId,
        bool approved,
        string calldata reason
    ) external onlyOwner {
        ApprovalRecord storage rec = _approvals[approvalId];
        if (rec.timestamp == 0) revert NotFound();

        rec.approved = approved;
        rec.reason = reason;
        rec.timestamp = block.timestamp;

        emit ApprovalUpdated(approvalId, approved, block.timestamp);
    }

    // ──────────────────────── Views ─────────────────────────────────

    /// @notice Get a full approval record.
    /// @param approvalId Record to retrieve.
    /// @return record The approval data.
    function getApproval(bytes32 approvalId) external view returns (ApprovalRecord memory record) {
        record = _approvals[approvalId];
    }

    /// @notice Verify whether an approval exists (timestamp != 0).
    /// @param approvalId Record to check.
    /// @return True if the record exists.
    function verifyApproval(bytes32 approvalId) external view returns (bool) {
        return _approvals[approvalId].timestamp != 0;
    }
}

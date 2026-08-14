// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AttestationRegistry
/// @notice On-chain store for Sentinel runtime integrity proofs.
/// @dev Stores composite hashes of runtime, policy, extension, and CLI binaries.
///      Business logic stays in backend.
contract AttestationRegistry is Ownable {
    // ──────────────────────────── Errors ────────────────────────────

    error ZeroHash();
    error AlreadyRegistered();

    // ──────────────────────────── Events ────────────────────────────

    event AttestationRegistered(
        bytes32 indexed attestationId,
        bytes32 runtimeHash,
        bytes32 policyHash,
        bytes32 extensionHash,
        bytes32 cliHash,
        uint256 timestamp
    );

    // ──────────────────────────── Structs ───────────────────────────

    struct Attestation {
        bytes32 attestationId;
        bytes32 runtimeHash;
        bytes32 policyHash;
        bytes32 extensionHash;
        bytes32 cliHash;
        uint256 timestamp;
    }

    // ──────────────────────────── Storage ───────────────────────────

    /// @dev attestationId => Attestation
    mapping(bytes32 => Attestation) private _attestations;

    // ──────────────────────────── Constructor ───────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────── State-Changing ────────────────────────

    /// @notice Register a runtime integrity attestation.
    /// @param attestationId Unique identifier (backend-generated).
    /// @param runtimeHash   Hash of the runtime binary/environment.
    /// @param policyHash    Hash of the active policy at attestation time.
    /// @param extensionHash Hash of the extension binary.
    /// @param cliHash       Hash of the CLI binary.
    function registerAttestation(
        bytes32 attestationId,
        bytes32 runtimeHash,
        bytes32 policyHash,
        bytes32 extensionHash,
        bytes32 cliHash
    ) external onlyOwner {
        if (runtimeHash == bytes32(0)) revert ZeroHash();
        if (_attestations[attestationId].timestamp != 0) revert AlreadyRegistered();

        _attestations[attestationId] = Attestation({
            attestationId: attestationId,
            runtimeHash: runtimeHash,
            policyHash: policyHash,
            extensionHash: extensionHash,
            cliHash: cliHash,
            timestamp: block.timestamp
        });

        emit AttestationRegistered(attestationId, runtimeHash, policyHash, extensionHash, cliHash, block.timestamp);
    }

    // ──────────────────────── Views ─────────────────────────────────

    /// @notice Verify that an attestation has been recorded.
    /// @param attestationId Id to check.
    /// @return True if recorded (timestamp != 0).
    function verifyAttestation(bytes32 attestationId) external view returns (bool) {
        return _attestations[attestationId].timestamp != 0;
    }

    /// @notice Get the full attestation record.
    /// @param attestationId Id to look up.
    /// @return attestation The attestation data.
    function getAttestation(bytes32 attestationId) external view returns (Attestation memory attestation) {
        attestation = _attestations[attestationId];
    }
}

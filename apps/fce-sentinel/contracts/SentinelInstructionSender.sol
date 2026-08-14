// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ITeeExtensionRegistry } from "./interfaces/ITeeExtensionRegistry.sol";
import { ITeeMachineRegistry } from "./interfaces/ITeeMachineRegistry.sol";

contract SentinelInstructionSender {
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_TYPE_SENTINEL = bytes32("SENTINEL");
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_COMMAND_AUTHORIZE_SECRET = bytes32("AUTHORIZE_SECRET");
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_COMMAND_ATTEST_POLICY = bytes32("ATTEST_POLICY");
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_COMMAND_AUTHORIZE_DANGEROUS = bytes32("AUTHORIZE_DANGEROUS");
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_COMMAND_GET_STATE = bytes32("GET_STATE");

    ITeeExtensionRegistry public immutable TEE_EXTENSION_REGISTRY;
    ITeeMachineRegistry public immutable TEE_MACHINE_REGISTRY;

    uint256 private constant _FIRST_PUBLIC_EXTENSION_ID = 0x10000;

    uint256 private _extensionId;

    event InstructionDispatched(bytes32 indexed instructionId, bytes32 indexed opType, bytes32 indexed opCommand);

    constructor(address _teeExtensionRegistry, address _teeMachineRegistry) {
        require(_teeExtensionRegistry != address(0), "TeeExtensionRegistry cannot be zero address");
        require(_teeMachineRegistry != address(0), "TeeMachineRegistry cannot be zero address");
        require(_teeExtensionRegistry.code.length > 0, "TeeExtensionRegistry has no code");
        require(_teeMachineRegistry.code.length > 0, "TeeMachineRegistry has no code");
        TEE_EXTENSION_REGISTRY = ITeeExtensionRegistry(_teeExtensionRegistry);
        TEE_MACHINE_REGISTRY = ITeeMachineRegistry(_teeMachineRegistry);
    }

    function setExtensionId() external {
        require(_extensionId == 0, "Extension ID already set.");

        uint256 c = TEE_EXTENSION_REGISTRY.nextPublicExtensionId();
        for (uint256 i = _FIRST_PUBLIC_EXTENSION_ID; i < c; ++i) {
            if (TEE_EXTENSION_REGISTRY.getTeeExtensionInstructionsSender(i) == address(this)) {
                _extensionId = i;
                return;
            }
        }
        revert("Extension ID not found.");
    }

    function _getExtensionId() internal view returns (uint256) {
        require(_extensionId != 0, "Extension ID is not set.");
        return _extensionId;
    }

    function authorizeSecret(bytes calldata _data) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);

        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_SENTINEL,
            opCommand: OP_COMMAND_AUTHORIZE_SECRET,
            message: _data,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });

        bytes32 instructionId = TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
        emit InstructionDispatched(instructionId, OP_TYPE_SENTINEL, OP_COMMAND_AUTHORIZE_SECRET);
    }

    function attestPolicy(bytes calldata _data) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);

        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_SENTINEL,
            opCommand: OP_COMMAND_ATTEST_POLICY,
            message: _data,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });

        bytes32 instructionId = TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
        emit InstructionDispatched(instructionId, OP_TYPE_SENTINEL, OP_COMMAND_ATTEST_POLICY);
    }

    function authorizeDangerous(bytes calldata _data) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);

        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_SENTINEL,
            opCommand: OP_COMMAND_AUTHORIZE_DANGEROUS,
            message: _data,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });

        bytes32 instructionId = TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
        emit InstructionDispatched(instructionId, OP_TYPE_SENTINEL, OP_COMMAND_AUTHORIZE_DANGEROUS);
    }

    function getState(bytes calldata _data) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);

        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_SENTINEL,
            opCommand: OP_COMMAND_GET_STATE,
            message: _data,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });

        bytes32 instructionId = TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
        emit InstructionDispatched(instructionId, OP_TYPE_SENTINEL, OP_COMMAND_GET_STATE);
    }
}

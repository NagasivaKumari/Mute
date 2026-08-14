// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITeeMachineRegistry {
    function getRandomTeeIds(uint256 _extensionId, uint256 _count) external view returns (address[] memory);
}

pragma solidity ^0.8.19;


interface WRAPPED {
    function deposit() external payable;
    function withdraw(uint wad) external;
}




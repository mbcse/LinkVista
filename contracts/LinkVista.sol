// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";

import './helperInterfaces.sol';

import '@openzeppelin/contracts/interfaces/IERC165.sol';
import "@openzeppelin/contracts/utils/Strings.sol";


import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
// import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol';

/// @title Router token swapping functionality
/// @notice Functions for swapping tokens via Uniswap V3
interface IV3SwapRouter is IUniswapV3SwapCallback {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @dev Setting `amountIn` to 0 will cause the contract to look up its own balance,
    /// and swap the entire amount, enabling contracts to send tokens before calling this function.
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
    /// @dev Setting `amountIn` to 0 will cause the contract to look up its own balance,
    /// and swap the entire amount, enabling contracts to send tokens before calling this function.
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps as little as possible of one token for `amountOut` of another token
    /// that may remain in the router after the swap.
    /// @param params The parameters necessary for the swap, encoded as `ExactOutputSingleParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    /// @notice Swaps as little as possible of one token for `amountOut` of another along the specified path (reversed)
    /// that may remain in the router after the swap.
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
}


interface IUniswapUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
    function execute(bytes calldata commands, bytes[] calldata inputs) external payable;
}


contract LinkVista is Initializable, PausableUpgradeable, AccessControlUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public defaultGasLimit;

    uint256 public limitOrderCounter;

    address public UNISWAP_V3_ROUTER; 
    address public UNISWAP_UNIVERSAL_ROUTER;
    address public WETH; 
    uint24 public POOL_FEE;

    int256 public dummyExecutionPrice;
    bool public dummyExecutionActivated;



    struct LimitOrder {
        uint256 orderId;
        address from;
        address to;        
        address fromToken;
        address toToken;
        uint256 amount;
        int256 price;
        uint256 toChain;
    }

    mapping(uint256 => LimitOrder) public limitOrders;
    uint256[] public activeLimitOrders;
    uint256[] public inactiveLimitOrders;


    struct Savings{
        uint256 id;
        address depositor;
        address token;
        uint256 amount;
        uint256 deadline;
    }

    uint256 public savingsCounter;

    mapping(uint256 => Savings) public savings;
    mapping(address => uint256[]) public usersSavings;

    mapping(uint256 => bool) public limitOrderExecuted;

    uint256 public totalActiveLimitOrders;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address defaultAdmin, 
        address swapRouterAddress,
        address universalRouterAddress,
        address wethAddress,
        uint24 poolFee)
        initializer public
    {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Ownable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(UPGRADER_ROLE, defaultAdmin);
        super.transferOwnership(defaultAdmin);

        UNISWAP_V3_ROUTER = swapRouterAddress;
        UNISWAP_UNIVERSAL_ROUTER = universalRouterAddress;
        WETH = wethAddress;
        POOL_FEE = poolFee;

        defaultGasLimit = 200000;
        dummyExecutionPrice = 10;
        dummyExecutionActivated = true;
    }

   

    function setDummyExecutionPrice(int256 _price) public onlyOwner {
        dummyExecutionPrice = _price;
    }

    function setDummyExecutionActivated(bool _activated) public onlyOwner {
        dummyExecutionActivated = _activated;
    }

    function setDefaultGasLimit(uint256 _gasLimit) public onlyOwner {
        defaultGasLimit = _gasLimit;
    }


    function setUniswapV3Router(address _router) public onlyOwner {
        UNISWAP_V3_ROUTER = _router;
    }

    function setUniswapUniversalRouter(address _router) public onlyOwner {
        UNISWAP_UNIVERSAL_ROUTER = _router;
    }

    function setWETH(address _weth) public onlyOwner {
        WETH = _weth;
    }

    function setPoolFee(uint24 _fee) public onlyOwner {
        POOL_FEE = _fee;
    }

    function getCurrentPrice(address _fromToken, address _toToken) public view returns (int256) {
        if (dummyExecutionActivated) {
            return dummyExecutionPrice;
        } else {
            return dummyExecutionPrice;
            // return getLatestPriceFeed();
        }
    }
    

/*
* ****************************************** Limit Order Functions **********************************************
*/


    function createLimitOrder(address _from,
        address _to,
        uint256 _amount,
        int256 _price,
        address _fromToken,
        address _toToken,
        uint256 _toChain) public {
        IERC20Upgradeable transferAsset = IERC20Upgradeable(_fromToken);
        uint256 allowance = transferAsset.allowance(_from, address(this));
        require(allowance >= _amount, "Insufficient token allowance");
        _createLimitOrder(_from, _to, _amount, _price, _fromToken, _toToken, _toChain);
    }

    function cancelLimitOrder(uint256 _orderId) public {
        LimitOrder memory limitOrder = limitOrders[_orderId];
        require(limitOrder.from == msg.sender || msg.sender == owner(), "Invalid user");
        require(!limitOrderExecuted[_orderId], "Limit Order Already Executed");
        limitOrderExecuted[_orderId] = true;
        for(uint i =0; i< activeLimitOrders.length; i++){
            if(activeLimitOrders[i] == _orderId){
                activeLimitOrders[i] = activeLimitOrders[activeLimitOrders.length-1];
                activeLimitOrders.pop();
                break;
            }
        }
        inactiveLimitOrders.push(_orderId);
    }

    function _createLimitOrder(
        address _from,
        address _to,
        uint256 _amount,
        int256 _price,
        address _fromToken,
        address _toToken,
        uint256 _toChain
    ) internal returns (uint256) {
        uint256 orderId = limitOrderCounter++;
        LimitOrder memory _limitOrder = LimitOrder({
            orderId: orderId,
            from: _from,
            to: _to,
            fromToken: _fromToken,
            toToken: _toToken,
            amount: _amount,
            price: _price,
            toChain: _toChain
        });
        limitOrders[orderId] = _limitOrder;
        activeLimitOrders.push(orderId);
        totalActiveLimitOrders++;
        return orderId;
    }

    function executeLimitOrder(
        uint256 _orderId
    ) public payable {
        LimitOrder memory limitOrder = limitOrders[_orderId];
        int currentPrice = getCurrentPrice(limitOrder.fromToken, limitOrder.toToken);
        if (currentPrice < limitOrder.price) {
            revert ("PRICE_NOT_MET");
        }

        require(!limitOrderExecuted[_orderId], "Limit Order Already Executed");
        limitOrderExecuted[_orderId] = true;

        _transferToken(limitOrder.from, address(this), limitOrder.fromToken, limitOrder.amount);

        _executeOrder(
            limitOrder
        );  
    }

    event LimitOrderExecuted(address from, address to, address fromToken, address toToken, uint256 amountIn, uint256 amountOut);

    function _executeOrder(
        LimitOrder memory limitOrder
    ) internal {
        require(limitOrder.amount > 0, "Amount must be greater than 0");
        require(limitOrder.fromToken != limitOrder.toToken, "From and To tokens must be different");
        require(limitOrder.toChain > 0, "To chain must be greater than 0");
        uint256 amountOut = _swapExactInUsingUniversalRouter(limitOrder.to, limitOrder.fromToken, limitOrder.toToken, limitOrder.amount, 0);
        
        for(uint i =0; i< activeLimitOrders.length; i++){
            if(activeLimitOrders[i] == limitOrder.orderId){
                activeLimitOrders[i] = activeLimitOrders[activeLimitOrders.length-1];
                activeLimitOrders.pop();
                totalActiveLimitOrders--;
                break;
            }
        }

        inactiveLimitOrders.push(limitOrder.orderId);
        emit LimitOrderExecuted(limitOrder.from, limitOrder.to, limitOrder.fromToken, limitOrder.toToken, limitOrder.amount, amountOut);
    }

    function resetActiveOrders() public onlyOwner {
        activeLimitOrders = new uint256[](0);
        totalActiveLimitOrders = 0;        
    }



/*
* ****************************************** Dex Functions **********************************************
*/
    function _swapExactIn(
        address receiver,
        address inputToken,
        address outputToken,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns(uint256 amountOut){

        // Approve the Uniswap V3 Router to spend the input token
        IERC20Upgradeable(inputToken).approve(UNISWAP_V3_ROUTER, amountIn);
        require(receiver != address(0), "Receiver must be set");

        // Set the path for the swap
        // address[] memory path = new address[](2);
        // path[0] = inputToken;
        // path[1] = outputToken;


        // Specify swap parameters
        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
            tokenIn: inputToken,
            tokenOut: outputToken,
            fee: POOL_FEE,
            recipient: receiver,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0 // You can set a price limit if needed, otherwise, set to 0
        });

        // Perform the swap
        amountOut = IV3SwapRouter(UNISWAP_V3_ROUTER).exactInputSingle{value: 0}(params);
    }


    function _swapExactInUsingUniversalRouter(
        address receiver,
        address inputToken,
        address outputToken,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns(uint256 amountOut){

        // Approve the Uniswap V3 Router to spend the input token
        _transferToken(address(this), UNISWAP_UNIVERSAL_ROUTER, inputToken, amountIn);
        require(receiver != address(0), "Receiver must be set");

        // Set the path for the swap
        // address[] memory path = new address[](2);
        // path[0] = inputToken;
        // path[1] = outputToken;

        bytes memory commands = new bytes(1);
        commands[0] = 0x00;

        bytes memory path = abi.encodePacked(inputToken, POOL_FEE, outputToken);

        bytes memory swapData = abi.encode(receiver, amountIn, amountOutMin, path, false);

        bytes[] memory commandInputs = new bytes[](1);
        commandInputs[0] = swapData;
        IUniswapUniversalRouter(UNISWAP_UNIVERSAL_ROUTER).execute{value: 0}(commands, commandInputs);
    }

/*
*************************************************Savings Account Functions************************************
*/

     function saveWealth(address _despositor, address _tokenAddress, uint256 _amount, uint256 _deadline) public payable{
        if(_tokenAddress != address(0)){
        IERC20Upgradeable transferAsset = IERC20Upgradeable(_tokenAddress);
        uint256 allowance = transferAsset.allowance(_despositor, address(this));
        require(allowance >= _amount, "Insufficient token allowance");
        _transferToken(_despositor, address(this), _tokenAddress, _amount);
        }else{
            require(msg.value >= _amount, "Invalid amount as msg.value");
        }
        _saveWealth(_despositor, _tokenAddress, _amount, _deadline);
     }

    function _saveWealth(address _despositor, address _tokenAddress, uint256 _amount, uint256 _deadline) internal {
        savingsCounter++;
        Savings memory _savings = Savings({
            id: savingsCounter,
            depositor: _despositor,
            token: _tokenAddress,
            amount: _amount,
            deadline: _deadline
        });
        usersSavings[_despositor].push(savingsCounter);
        savings[savingsCounter] = _savings;

    } 

    function withdrawWealth(uint256 _id) public {
        Savings memory _savings = savings[_id];
        require(_savings.depositor == msg.sender, "Invalid user");
        require(_savings.deadline < block.timestamp, "Deadline not reached");
        if(_savings.token == address(0)){
            payable(msg.sender).transfer(_savings.amount);
        }else{
            _transferToken(address(this), _savings.depositor, _savings.token, _savings.amount);
        }
    }  


    function getActiveLimitsOrders() public view returns(uint256[] memory){
        return activeLimitOrders;
    }

    function getUserSavings(address _user) public view returns(uint256[] memory){
        return usersSavings[_user];
    }



/*
* ****************************************** Helper Functions **********************************************
*/

    function _giveTokenApproval(address _spender, address _tokenAddress, uint256 _tokenAmount) internal {
        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);
        token.approve(_spender, _tokenAmount); // Approving Spender to use tokens from contract
    }

    function _transferToken(address _from, address _to, address _tokenAddress, uint256 _tokenAmount) internal {
        if(_from == address(this)){
            IERC20Upgradeable transferAsset = IERC20Upgradeable(_tokenAddress);
            transferAsset.transfer(_to, _tokenAmount);
        }else {
            IERC20Upgradeable transferAsset = IERC20Upgradeable(_tokenAddress);
            transferAsset.transferFrom(_from, _to, _tokenAmount);
        }
    }

/*
* ************************************************Contract Settings ***************************************************
*/
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    receive() external payable {}

}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title GameToken
 * @dev 推币机游戏代币 $COIN
 *
 * 功能:
 * - ERC-20 标准代币
 * - 可铸造（仅游戏合约）
 * - 可销毁
 * - 可暂停
 * - 每日铸造上限
 */
contract GameToken is ERC20, ERC20Burnable, Ownable, Pausable {

    // ============ 状态变量 ============

    address public gameController;      // 游戏控制器合约地址
    address public rewardPool;          // 奖励池合约地址

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;  // 10亿代币
    uint256 public constant DAILY_MINT_LIMIT = 1_000_000 * 10**18;  // 每日铸造上限: 100万

    uint256 public totalMinted;         // 总铸造量
    uint256 public todayMinted;         // 今日铸造量
    uint256 public lastMintDay;         // 上次铸造日期

    // ============ 事件 ============

    event GameControllerUpdated(address indexed oldController, address indexed newController);
    event RewardPoolUpdated(address indexed oldPool, address indexed newPool);
    event RewardMinted(address indexed player, uint256 amount, bytes32 sessionId);
    event TokensBurned(address indexed burner, uint256 amount);

    // ============ 修饰符 ============

    modifier onlyGameController() {
        require(msg.sender == gameController, "GameToken: caller is not game controller");
        _;
    }

    modifier onlyRewardPool() {
        require(msg.sender == rewardPool, "GameToken: caller is not reward pool");
        _;
    }

    // ============ 构造函数 ============

    constructor() ERC20("Coin Pusher Game Token", "COIN") {
        // 初始铸造: 10% 给团队（用于流动性和运营）
        uint256 initialSupply = MAX_SUPPLY / 10;
        _mint(msg.sender, initialSupply);
        totalMinted = initialSupply;
        lastMintDay = block.timestamp / 1 days;
    }

    // ============ 核心函数 ============

    /**
     * @dev 设置游戏控制器地址
     */
    function setGameController(address _gameController) external onlyOwner {
        require(_gameController != address(0), "GameToken: zero address");
        address oldController = gameController;
        gameController = _gameController;
        emit GameControllerUpdated(oldController, _gameController);
    }

    /**
     * @dev 设置奖励池地址
     */
    function setRewardPool(address _rewardPool) external onlyOwner {
        require(_rewardPool != address(0), "GameToken: zero address");
        address oldPool = rewardPool;
        rewardPool = _rewardPool;
        emit RewardPoolUpdated(oldPool, _rewardPool);
    }

    /**
     * @dev 铸造游戏奖励代币（仅奖励池可调用）
     * @param player 玩家地址
     * @param amount 铸造数量
     * @param sessionId 游戏会话ID
     */
    function mintReward(
        address player,
        uint256 amount,
        bytes32 sessionId
    ) external onlyRewardPool whenNotPaused returns (bool) {
        require(player != address(0), "GameToken: mint to zero address");
        require(amount > 0, "GameToken: amount must be positive");

        // 检查总供应量上限
        require(totalMinted + amount <= MAX_SUPPLY, "GameToken: exceeds max supply");

        // 检查每日铸造上限
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay) {
            // 新的一天，重置每日铸造量
            todayMinted = 0;
            lastMintDay = currentDay;
        }

        require(todayMinted + amount <= DAILY_MINT_LIMIT, "GameToken: exceeds daily mint limit");

        // 铸造代币
        _mint(player, amount);
        totalMinted += amount;
        todayMinted += amount;

        emit RewardMinted(player, amount, sessionId);
        return true;
    }

    /**
     * @dev 销毁代币（防通胀机制）
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev 暂停代币转账（紧急情况）
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复代币转账
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 重写转账函数，添加暂停检查
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    // ============ 查询函数 ============

    /**
     * @dev 查询剩余可铸造数量
     */
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }

    /**
     * @dev 查询今日剩余铸造额度
     */
    function getTodayRemainingMint() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay) {
            return DAILY_MINT_LIMIT;
        }
        return DAILY_MINT_LIMIT - todayMinted;
    }
}

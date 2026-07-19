// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofPalReceipts
 * @dev Cryptographic receipt store for decentralized transactions on Monad.
 * Allows senders to register receipt metadata bound to an IPFS CID onchain,
 * facilitating natural language searches and client-side proof verification.
 */
contract ProofPalReceipts {
    
    struct Receipt {
        string receiptId;     // Unique identifier (UUID or business invoice ID)
        address sender;       // Address that sent the payment
        address receiver;     // Address that received the payment
        uint256 amount;       // Paid amount in token base units
        string tokenSymbol;   // Token symbol (e.g., MON, USDC)
        string ipfsHash;      // IPFS CID containing receipt metadata (summary, tags, full description)
        uint256 timestamp;    // Timestamp when registered onchain
        string purpose;       // Short purpose description
    }

    // Mapping from receiptId to the Receipt record
    mapping(string => Receipt) private receipts;

    // Mapping from user address to their sent or received receipt IDs
    mapping(address => string[]) private userReceiptIds;

    // Events
    event ReceiptCreated(
        string indexed receiptId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string tokenSymbol,
        string ipfsHash
    );

    event ReceiptVerified(
        string indexed receiptId,
        address indexed verifier,
        bool status
    );

    /**
     * @notice Registers a new receipt onchain.
     * @param _receiptId The unique receipt ID.
     * @param _receiver The payment recipient.
     * @param _amount The transaction amount in base units.
     * @param _tokenSymbol The currency symbol.
     * @param _ipfsHash The IPFS CID of the metadata JSON.
     * @param _purpose The purpose or category of the transaction.
     */
    function createReceipt(
        string memory _receiptId,
        address _receiver,
        uint256 _amount,
        string memory _tokenSymbol,
        string memory _ipfsHash,
        string memory _purpose
    ) external {
        require(bytes(_receiptId).length > 0, "Receipt ID cannot be empty");
        require(_receiver != address(0), "Receiver cannot be the zero address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(receipts[_receiptId].timestamp == 0, "Receipt ID already exists");

        // Save receipt
        receipts[_receiptId] = Receipt({
            receiptId: _receiptId,
            sender: msg.sender,
            receiver: _receiver,
            amount: _amount,
            tokenSymbol: _tokenSymbol,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            purpose: _purpose
        });

        // Add to user indices
        userReceiptIds[msg.sender].push(_receiptId);
        if (_receiver != msg.sender) {
            userReceiptIds[_receiver].push(_receiptId);
        }

        emit ReceiptCreated(_receiptId, msg.sender, _receiver, _amount, _tokenSymbol, _ipfsHash);
    }

    /**
     * @notice Returns details of a specific receipt.
     * @param _receiptId The receipt identifier.
     */
    function getReceipt(string memory _receiptId) external view returns (Receipt memory) {
        Receipt memory receipt = receipts[_receiptId];
        require(receipt.timestamp > 0, "Receipt does not exist");
        return receipt;
    }

    /**
     * @notice Returns all receipt IDs associated with an address (as sender or receiver).
     * @param _user The user's wallet address.
     */
    function getReceiptsByUser(address _user) external view returns (string[] memory) {
        return userReceiptIds[_user];
    }

    /**
     * @notice Verifies a receipt by receiptId.
     * @param _receiptId The receipt identifier.
     */
    function verifyReceipt(string memory _receiptId) external view returns (bool, Receipt memory) {
        Receipt memory receipt = receipts[_receiptId];
        bool isValid = receipt.timestamp > 0;
        return (isValid, receipt);
    }
}

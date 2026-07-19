import hre from "hardhat";

async function main() {
  console.log("Starting deployment of ProofPalReceipts to Monad Testnet...");

  const { ethers } = hre;
  const ProofPalReceipts = await ethers.getContractFactory("ProofPalReceipts");
  const contract = await ProofPalReceipts.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("ProofPalReceipts deployed successfully!");
  console.log(`Contract Address: ${contractAddress}`);
}

main().catch((error) => {
  console.error("Error during deployment:", error);
  process.exitCode = 1;
});

import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    //mainnet
    let vrfCoordinator = "0x271682DEB8C4E0901D1a1550aD2e64D568E69909";
    let keyHash = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";
    let subscriptionId = 631;

    const providerFactory = await ethers.getContractFactory("RandomProvider", deployer);

    const provider = await providerFactory.deploy(vrfCoordinator, subscriptionId, keyHash);

    await provider.deployed();
    console.log(`RandomProvider deployed at: ${provider.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

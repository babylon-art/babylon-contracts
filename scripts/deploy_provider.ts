import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0xc50c17359f2bb803ef7D2e59efe36BeC799FaFb6";
    let subscriptionId = 4099;

    const providerFactory = await ethers.getContractFactory("RandomProvider", deployer);

    const provider = await providerFactory.deploy(coreAddress, subscriptionId);

    await provider.deployed();
    console.log(`RandomProvider deployed at: ${provider.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

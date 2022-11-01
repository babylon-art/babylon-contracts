import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0x064269A2C161884dd7090267BCc946D3266fB6aa";
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

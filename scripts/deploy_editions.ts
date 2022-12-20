import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    const editionsFactory = await ethers.getContractFactory("BabylonEditionsExtension", deployer);
    const editions = await editionsFactory.deploy();

    await editions.deployed();
    console.log(`BabylonEditionsExtension deployed at: ${editions.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

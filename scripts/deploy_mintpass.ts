import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    const mintPassFactory = await ethers.getContractFactory("BabylonMintPass", deployer);

    const mintPass = await mintPassFactory.deploy();

    await mintPass.deployed();
    console.log(`BabylonMintPass deployed at: ${mintPass.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

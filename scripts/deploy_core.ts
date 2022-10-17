import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    const coreFactory = await ethers.getContractFactory("BabylonCore", deployer);

    const core = await coreFactory.deploy();

    await core.deployed();
    console.log(`BabylonCore deployed at: ${core.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    const controllerFactory = await ethers.getContractFactory("TokensController", deployer);

    const controller = await controllerFactory.deploy();

    await controller.deployed();
    console.log(`TokensController deployed at: ${controller.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

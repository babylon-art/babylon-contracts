import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let core = "0x0c32C1E4397a5B1BF73741b6B923f9313e9f4ecd";
    let mintPassImpl = "0x8062e4902b5D7bBEDC1790306763Eeb75346E587";

    const controllerFactory = await ethers.getContractFactory("TokensController", deployer);

    const controller = await controllerFactory.deploy(core, mintPassImpl);

    await controller.deployed();
    console.log(`TokensController deployed at: ${controller.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

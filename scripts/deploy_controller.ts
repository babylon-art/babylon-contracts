import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let mintPassImpl = "0xE45f4f3c8a7AAe064a3B1Ee659e66155f2105238";

    const controllerFactory = await ethers.getContractFactory("TokensController", deployer);

    const controller = await controllerFactory.deploy(mintPassImpl);

    await controller.deployed();
    console.log(`TokensController deployed at: ${controller.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let core = "0x4b40E4AC3d17b81341A506c064cbacb808548474";
    let mintPassImpl = "0xA4e8261961565290A757EB699AA6E96DBD8b147B";

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

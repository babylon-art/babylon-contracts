import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let core = "0xEbD86a050D5F60a94B84dd4406B6E962c3270D4d";
    let mintPassImpl = "0x72196a5116231F465d7e93002752cf943c4bf7E6";

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

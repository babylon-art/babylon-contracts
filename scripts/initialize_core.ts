import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreProxy = "";

    let controllerAddress = "";
    let providerAddress = "";
    let editionsExtensionAddress = "";

    const controller = await ethers.getContractAt("TokensController", controllerAddress, deployer);
    const provider = await ethers.getContractAt("RandomProvider", providerAddress, deployer);
    const editions = await ethers.getContractAt("BabylonEditionsExtension", editionsExtensionAddress, deployer);

    let tx = await controller.setBabylonCore(coreProxy);
    await tx.wait();
    console.log("Controller initialized");

    tx = await provider.setBabylonCore(coreProxy);
    await tx.wait();
    console.log("Provider initialized");

    tx = await editions.setBabylonCore(coreProxy);
    await tx.wait();
    console.log("Editions initialized");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

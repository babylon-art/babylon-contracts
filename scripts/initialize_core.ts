import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreProxy = "0x68305B515D56ffEfD1f4a062510ad5a227655020";

    let controllerAddress = "0x0B32536F1086095AA363560830bf3A1e67C1f762";
    let providerAddress = "0xF4642C3A92d3aC79861C922D59b404640E012b52";
    let editionsExtensionAddress = "0x87B9D70817bd974041753346259103fB9DB18A79";

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

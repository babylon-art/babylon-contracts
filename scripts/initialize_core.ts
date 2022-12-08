import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreProxy = "0x7fbFBC7c0Cf34Ddf8b16B05A4efeE817273dE5a7";

    let controllerAddress = "0x16d4Ca85666F533a3b5274eC921D3cD90f4EE0C8";
    let providerAddress = "0x1dfb64676132D243dAB17f59a10F5052e29e1E70";
    let editionsExtensionAddress = "0xc50c17359f2bb803ef7D2e59efe36BeC799FaFb6";

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

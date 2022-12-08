import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreProxy = "0xa9442CEF97552c64f752Bb9fb7430D7A7B85aBAe";

    let controllerAddress = "0xF760434F91889Df457bA35F65f8226b65485B47C";
    let providerAddress = "0x8aa6C77Af4Dc1f50Ada944683F717F48b1765D9e";
    let editionsExtensionAddress = "0x36546DBd1e97d68C4266e3f9a920bca11d8F7fc1";

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

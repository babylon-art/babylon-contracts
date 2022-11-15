import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0x0c32C1E4397a5B1BF73741b6B923f9313e9f4ecd";
    let controllerAddress = "0x4966BFee3dD9475eB0A1A51DdE5dA5c9b5A57Bb7";
    let providerAddress = "0xcF815E26aAE167FfE4Bd5B1E51C9a5a289A9aA4a";
    let editionsExtension = "0xcE2F4e9C374B7BA5a2B2dEA15640152668A4C9b3";

    const core = await ethers.getContractAt("BabylonCore", coreAddress, deployer);
    let tx = await core.initialize(controllerAddress, providerAddress, editionsExtension);
    await tx.wait();

    console.log(`BabylonCore initialized`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

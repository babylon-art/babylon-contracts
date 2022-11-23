import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0x4b40E4AC3d17b81341A506c064cbacb808548474";
    let controllerAddress = "0xDa77eC8b561202D66B8c6F98f8bD03a28450F084";
    let providerAddress = "0x7dCFaA0379fDc62396341F7f80dCD494d8453f20";
    let editionsExtension = "0x90544E095f4508dC5cae3a4805fD3C7c3cECA5a6";

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

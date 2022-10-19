import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0xc50c17359f2bb803ef7D2e59efe36BeC799FaFb6";
    let controllerAddress = "0x8ee0805E4bAF4413f72108dF7a20b1c9a8fF794F";
    let providerAddress = "0x22319d4da064DEddf6D297e0277383620028229e";

    const core = await ethers.getContractAt("BabylonCore", coreAddress, deployer);
    let tx = await core.initialize(controllerAddress, providerAddress);
    await tx.wait();

    console.log(`BabylonCore initialized`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0x064269A2C161884dd7090267BCc946D3266fB6aa";
    let controllerAddress = "0x541d652278DBd64ABF12aB24f0A99Ced63a9c867";
    let providerAddress = "0x5cCB3b26776a14c1B453C6cF4887A300F9adfcbE";

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

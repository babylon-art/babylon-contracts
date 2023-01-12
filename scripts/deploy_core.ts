import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let controllerAddress = "";
    let providerAddress = "";
    let editionsExtensionAddress = "";

    let treasury = deployer.address;

    let coreFactory = await ethers.getContractFactory('BabylonCore', deployer);

    let core = await upgrades.deployProxy(
        coreFactory,
        [
            controllerAddress,
            providerAddress,
            editionsExtensionAddress,
            treasury
        ]
    );

    console.log(`BabylonCore Proxy deployed at: ${core.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let controllerAddress = "0x0B32536F1086095AA363560830bf3A1e67C1f762";
    let providerAddress = "0xF4642C3A92d3aC79861C922D59b404640E012b52";
    let editionsExtensionAddress = "0x87B9D70817bd974041753346259103fB9DB18A79";

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

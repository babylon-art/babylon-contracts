import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let controllerAddress = "0x16d4Ca85666F533a3b5274eC921D3cD90f4EE0C8";
    let providerAddress = "0x1dfb64676132D243dAB17f59a10F5052e29e1E70";
    let editionsExtensionAddress = "0xc50c17359f2bb803ef7D2e59efe36BeC799FaFb6";

    let minTotalPrice = ethers.utils.parseUnits("0.0001", 18);
    let totalFeesCeiling = ethers.utils.parseUnits("1", 18);
    let feeMultiplier = 10; // 1%
    let treasury = deployer.address;

    let coreFactory = await ethers.getContractFactory('BabylonCore', deployer);

    let core = await upgrades.deployProxy(
        coreFactory,
        [
            controllerAddress,
            providerAddress,
            editionsExtensionAddress,
            minTotalPrice,
            totalFeesCeiling,
            feeMultiplier,
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

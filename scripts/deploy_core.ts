import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let controllerAddress = "0xF760434F91889Df457bA35F65f8226b65485B47C";
    let providerAddress = "0x8aa6C77Af4Dc1f50Ada944683F717F48b1765D9e";
    let editionsExtensionAddress = "0x36546DBd1e97d68C4266e3f9a920bca11d8F7fc1";

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

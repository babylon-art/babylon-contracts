import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreAddress = "0xEbD86a050D5F60a94B84dd4406B6E962c3270D4d";
    let controllerAddress = "0x34C9Dcec0f71d672749b902b2d4f631023cb69FF";
    let providerAddress = "0x56C3209AC781687B334a2D857a65d9ca3878Ee66";
    let editionsExtension = "0xFF5db6150491e154D86c6328fa109D79be9Aec01";

    let minTotalPrice = ethers.utils.parseUnits("0.0001", 18);
    let totalFeesCeiling = ethers.utils.parseUnits("1", 18);
    let feeMultiplier = 10; // 1%
    let treasury = deployer.address;

    const core = await ethers.getContractAt("BabylonCore", coreAddress, deployer);
    let tx = await core.initialize(
        controllerAddress,
        providerAddress,
        editionsExtension,
        minTotalPrice,
        totalFeesCeiling,
        feeMultiplier,
        treasury
    );

    await tx.wait();

    console.log(`BabylonCore initialized`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber} from "ethers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let coreProxy = "";
    let referralTimeframe = 2592000;

    let amounts = [
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
    ];

    let payoutBPS = [
        BigNumber.from("1000"),
        BigNumber.from("1500"),
        BigNumber.from("2000"),
        BigNumber.from("2500")
    ];

    let affiliateFactory = await ethers.getContractFactory('AffiliateController', deployer);

    let affiliate = await upgrades.deployProxy(
        affiliateFactory,
        [
            coreProxy,
            referralTimeframe,
            amounts,
            payoutBPS
        ]
    );

    console.log(`AffiliateController Proxy deployed at: ${affiliate.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let operatorFilterer = "0x851b63Bf5f575eA68A84baa5Ff9174172E4d7838";

    const editionsFactory = await ethers.getContractFactory("BabylonEditionsExtension", deployer);
    const editions = await editionsFactory.deploy(operatorFilterer);

    await editions.deployed();
    console.log(`BabylonEditionsExtension deployed at: ${editions.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

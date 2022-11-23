import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let deployer: SignerWithAddress;

    [deployer] = await ethers.getSigners();

    let babylonCore = "0x4b40E4AC3d17b81341A506c064cbacb808548474";
    let manifoldCreatorCore = "0x535f5d15BD9b978d932A463522A9075C3eDD30fF";

    const editionsFactory = await ethers.getContractFactory("BabylonEditionsExtension", deployer);
    const editions = await editionsFactory.deploy(manifoldCreatorCore, babylonCore);

    await editions.deployed();
    console.log(`BabylonEditionsExtension deployed at: ${editions.address}`);

    let creatorCore = await ethers.getContractAt("IERC1155CreatorCore", manifoldCreatorCore, deployer);
    let tx = await creatorCore["registerExtension(address,string)"](editions.address, "");
    await tx.wait();
    console.log("Editions Extension registered to the CreatorCore");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

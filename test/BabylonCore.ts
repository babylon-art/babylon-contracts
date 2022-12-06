import hre from 'hardhat';
import chai from 'chai';

import {Contract, constants, utils} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {solidity} from 'ethereum-waffle';

import {
    balanceOfETH,
    NFT_COLLECTION,
    EDITIONS_COLLECTION,
    OPERATOR_FILTERER,
    VRF_COORDINATOR,
    VRF_SUBSCRIPTION_ID,
    VRF_KEYHASH
} from './utils';

import {IBabylonCore} from "../typechain";

const { ethers } = hre;

chai.use(solidity);
const {expect} = chai;

let deployer: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

let core: Contract, coreFactory;
let mintPass: Contract, mintPassFactory;
let controller: Contract, controllerFactory;
let editionsExtension: Contract, editionsExtensionFactory;
let mockRandomProvider: Contract, mockRandomProviderFactory;
let manifoldCreator: Contract;

let nft: Contract;

describe('BabylonCore', function () {
    this.timeout(3000000);
    describe('set up', function () {
        it('#deployment', async () => {
            [deployer, user1, user2] = await ethers.getSigners();
            coreFactory = await ethers.getContractFactory('BabylonCore', deployer);
            core = await coreFactory.deploy();
            await core.deployed();

            mintPassFactory = await ethers.getContractFactory("BabylonMintPass", deployer);
            mintPass = await mintPassFactory.deploy();

            controllerFactory = await ethers.getContractFactory('TokensController', deployer);
            controller = await controllerFactory.deploy(core.address, mintPass.address);
            await controller.deployed();

            editionsExtensionFactory = await ethers.getContractFactory("BabylonEditionsExtension", deployer);
            editionsExtension = await editionsExtensionFactory.deploy(core.address, OPERATOR_FILTERER);
            await editionsExtension.deployed();

            mockRandomProviderFactory = await ethers.getContractFactory('MockRandomProvider', deployer);

            mockRandomProvider = await mockRandomProviderFactory.deploy(core.address);
            await mockRandomProvider.deployed();

            nft = await ethers.getContractAt('IERC721', NFT_COLLECTION, deployer);
        });

        it('#initialize', async function () {
            let minTotalPrice = ethers.utils.parseUnits("0.1", 18);
            let totalFeesCeiling = ethers.utils.parseUnits("1", 18);
            let feeMultiplier = 10; // 1%
            let treasury = deployer.address;

            await core.initialize(
                controller.address,
                mockRandomProvider.address,
                editionsExtension.address,
                minTotalPrice,
                totalFeesCeiling,
                feeMultiplier,
                treasury
            );

            expect(await core.getTokensController()).to.be.equal(controller.address);
            expect(await core.getRandomProvider()).to.be.equal(mockRandomProvider.address);
            expect(await core.getEditionsExtension()).to.be.equal(editionsExtension.address);
            expect(await core.getMinTotalPrice()).to.be.equal(minTotalPrice);
            expect(await core.getTotalFeesCeiling()).to.be.equal(totalFeesCeiling);
            expect(await core.getFeeMultiplier()).to.be.equal(feeMultiplier);
            expect(await core.getTreasury()).to.be.equal(treasury);
            expect(await core.BASIS_POINTS()).to.be.equal(1000);
            expect(await core.MAX_FEE_MULTIPLIER()).to.be.equal(25);
        });
    });

    describe('#listing 1', function () {
        it('should start listing', async () => {
            let item: IBabylonCore.ListingItemStruct;
            let timeStart = 0;
            let tokenId = 1;
            let amount = 1;
            let price = ethers.utils.parseUnits("1", 18);
            let totalTickets = 5;
            let editionRoyaltiesBps = 1000; //10%
            let editionURI = "ipfs://CID/metadata.json";

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            }

            let owner = await nft.ownerOf(tokenId);
            expect(owner).to.be.eq(deployer.address);

            await nft.approve(controller.address, tokenId);

            await core.startListing(
                item,
                timeStart,
                price,
                totalTickets,
                editionRoyaltiesBps,
                editionURI
            );

            let newId = await core.getListingId(nft.address, tokenId);
            expect(newId).to.be.eq(1);

            let info = await core.getListingInfo(newId);
            expect(info.item.itemType).to.be.eq(0);
            expect(info.item.token).to.be.eq(nft.address);
            expect(info.item.identifier).to.be.eq(tokenId);
            expect(info.item.amount).to.be.eq(amount);

            expect(info.state).to.be.eq(0);
            expect(info.creator).to.be.eq(deployer.address);
            expect(info.claimer).to.be.eq(ethers.constants.AddressZero);
            expect(info.randomRequestId).to.be.eq(0);
            expect(info.price).to.be.eq(price);
            expect(info.timeStart).to.be.eq(timeStart);
            expect(info.totalTickets).to.be.eq(totalTickets);
            expect(info.currentTickets).to.be.eq(0);

            mintPass = await ethers.getContractAt("BabylonMintPass", info.mintPass, user1);
            let editionsCollection = await editionsExtension.getEditionsCollection(newId);
            manifoldCreator = await ethers.getContractAt("IERC721Metadata", editionsCollection, deployer);
        });

        it('should participate (3/5 tickets)', async () => {
            let listingId = 1;
            let numTickets = 3;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await core.connect(user1).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets)
                }
            );

            let amount = await mintPass.balanceOf(user1.address);
            expect(amount).to.be.eq(numTickets);
            info = await core.getListingInfo(listingId);
            expect(info.currentTickets).to.be.eq(numTickets);
        });

        it('should not participate with more than available tickets', async () => {
            let listingId = 1;
            let numTickets = 5;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await expect(core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets)
                }
            )).to.be.revertedWith("BabylonCore: no available tickets");
        });

        it('should not participate with less ETH total price', async () => {
            let listingId = 1;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await expect(core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets - 1)
                }
            )).to.be.revertedWith("BabylonCore: msg.value doesn't match price for tickets");
        });

        it('should not participate with more ETH total price', async () => {
            let listingId = 1;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await expect(core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets + 1)
                }
            )).to.be.revertedWith("BabylonCore: msg.value doesn't match price for tickets");
        });

        it('should participate (5/5 tickets)', async () => {
            let listingId = 1;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets)
                }
            );

            info = await core.getListingInfo(listingId);
            let amount = await mintPass.balanceOf(user2.address);

            expect(info.state).to.be.eq(1); //Resolving
            expect(info.currentTickets).to.be.eq(info.totalTickets);
            expect(amount).to.be.eq(numTickets);
        });

        it('should fulfill random and get winner', async () => {
            let listingId = 1;

            await mockRandomProvider.fulfillRandomWords(
                listingId,
                [5]
            );

            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(2); //Successful
            expect(info.claimer).to.be.eq(user1.address); //first participant is the winner

            let tokenId = 1;
            let owner = await nft.ownerOf(tokenId);
            expect(owner).to.be.eq(user1.address); //nft prize is successfully transferred to the winner
        });

        it('creator should not cancel successful listing', async () => {
            let listingId = 1;

            await expect(core.connect(deployer).cancelListing(listingId))
                .to.be.revertedWith("BabylonCore: Listing state should be active");
        });

        it('participant should mint editions', async () => {
            let listingId = 1;
            let amount = await mintPass.balanceOf(user1.address);

            let balance = await manifoldCreator.balanceOf(user1.address);
            expect(balance).to.be.eq(0);

            await core.connect(user1).mintEdition(listingId);
            balance = await manifoldCreator.balanceOf(user1.address);
            expect(balance).to.be.eq(amount);
            amount = await mintPass.balanceOf(user1.address);
            expect(amount).to.be.eq(0);
        });

        it('participant should not mint edition if 0 mintpasses', async () => {
            let listingId = 1;
            let amount = await mintPass.balanceOf(user1.address);
            expect(amount).to.be.eq(0);

            await expect(core.connect(user1).mintEdition(listingId))
                .to.be.revertedWith("BabylonMintPass: cannot burn 0 tokens");
        });

        it('participant should mint editions with transferred mintpasses', async () => {
            let listingId = 1;
            let amount = await mintPass.balanceOf(user2.address);

            await mintPass.connect(user2)["safeTransferFrom(address,address,uint256)"](user2.address, user1.address, 3);
            await mintPass.connect(user2)["safeTransferFrom(address,address,uint256)"](user2.address, user1.address, 4);

            let balance = await manifoldCreator.balanceOf(user1.address);

            await core.connect(user1).mintEdition(listingId);
            let editions = await manifoldCreator.balanceOf(user1.address);
            expect(editions).to.be.eq(amount.add(balance));
            amount = await mintPass.balanceOf(user1.address);
            expect(amount).to.be.eq(0);
        });

        it('participant should not refund if listing is successful', async () => {
            let listingId = 1;
            await expect(core.connect(user1).refund(listingId))
                .to.be.revertedWith("BabylonCore: Listing state should be canceled to refund");
        });

        it('creator should receive funds and finalize listing', async () => {
            let listingId = 1;
            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(2); //Successful
            let ethBalanceBefore = await balanceOfETH(deployer.address);

            await core.transferETHToCreator(listingId);

            info = await core.getListingInfo(listingId);
            let ethBalanceAfter = await balanceOfETH(deployer.address);
            expect(info.state).to.be.eq(3); //Finalized
            expect(ethBalanceAfter).to.be.gt(ethBalanceBefore);
        });

        it('creator should not receive funds twice', async () => {
            let listingId = 1;
            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(3); //Finalized

            await expect(core.transferETHToCreator(listingId))
                .to.be.revertedWith("BabylonCore: Listing state should be successful");
        });
    });

    describe('#listing 2', function () {
        it('should start listing', async () => {
            let item: IBabylonCore.ListingItemStruct;
            let timeStart = 0;
            let tokenId = 2;
            let amount = 1;
            let price = ethers.utils.parseUnits("2", 18);
            let totalTickets = 10;
            let editionRoyaltiesBps = 1000; //10%
            let editionURI = "ipfs://CID/metadata.json";

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            }

            let owner = await nft.ownerOf(tokenId);
            expect(owner).to.be.eq(user1.address);

            await nft.connect(user1).approve(controller.address, tokenId);

            await core.connect(user1).startListing(
                item,
                timeStart,
                price,
                totalTickets,
                editionRoyaltiesBps,
                editionURI
            );

            let newId = await core.getListingId(nft.address, tokenId);
            expect(newId).to.be.eq(2);

            let info = await core.getListingInfo(newId);
            mintPass = await ethers.getContractAt("BabylonMintPass", info.mintPass, user1);
        });

        it('should participate (2/10 tickets)', async () => {
            let listingId = 2;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            expect(info.state).to.be.eq(0); // Active

            await core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets)
                }
            );

            let amount = await mintPass.balanceOf(user2.address);
            expect(amount).to.be.eq(numTickets);
            info = await core.getListingInfo(listingId);
            expect(info.currentTickets).to.be.eq(numTickets);
        });

        it('not creator should not be able to cancel listing', async () => {
            let listingId = 2;
            let info = await core.getListingInfo(listingId);

            expect(info.creator).to.be.not.eq(deployer.address);

            await expect(core.connect(deployer).cancelListing(listingId))
                .to.be.revertedWith("BabylonCore: Only listing creator can cancel");
        });

        it('creator should cancel listing', async () => {
            let listingId = 2;

            await core.connect(user1).cancelListing(listingId);
            let info = await core.getListingInfo(listingId);

            expect(info.state).to.be.eq(4); //Canceled
        });

        it('should not participate in canceled listing', async () => {
            let listingId = 2;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            expect(info.state).to.be.eq(4); // Canceled

            await expect(core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets)
                }
            )).to.be.revertedWith("BabylonCore: Listing state should be active");
        });

        it('participant should not mint editions in canceled listing', async () => {
            let listingId = 2;

            await expect(core.connect(user1).mintEdition(listingId))
                .to.be.revertedWith("BabylonCore: Listing should be successful");
        });

        it('participant should not mint edition if 0 mintpasses', async () => {
            let listingId = 1;
            let amount = await mintPass.balanceOf(user1.address);
            expect(amount).to.be.eq(0);

            await expect(core.connect(user1).mintEdition(listingId))
                .to.be.revertedWith("BabylonMintPass: cannot burn 0 tokens");
        });

        it('participant should refund if listing is canceled', async () => {
            let listingId = 2;
            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(4); //Canceled
            let amount = await mintPass.balanceOf(user2.address);
            let ethBalanceBefore = await balanceOfETH(user2.address);
            expect(amount).to.be.eq(2);

            await core.connect(user2).refund(listingId);

            amount = await mintPass.balanceOf(user2.address);
            let ethBalanceAfter = await balanceOfETH(user2.address);
            expect(amount).to.be.eq(0);
            expect(ethBalanceAfter).to.be.gt(ethBalanceBefore);
        });

        it('creator should not refund twice', async () => {
            let listingId = 2;
            let amount = await mintPass.balanceOf(user2.address);
            expect(amount).to.be.eq(0);

            await expect(core.connect(user2).refund(listingId))
                .to.be.revertedWith("BabylonMintPass: cannot burn 0 tokens");
        });

        it('creator should not receive funds from canceled listing', async () => {
            let listingId = 2;
            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(4); //Canceled

            await expect(core.transferETHToCreator(listingId))
                .to.be.revertedWith("BabylonCore: Listing state should be successful");
        });
    });
})

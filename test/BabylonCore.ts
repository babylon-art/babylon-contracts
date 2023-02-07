import hre from 'hardhat';
import chai from 'chai';

import {Contract, constants} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {solidity} from 'ethereum-waffle';

import {
    balanceOfETH
} from './utils';

import {BabylonCore, IEditionsExtension} from '../typechain';
import {IBabylonCore} from '../typechain/contracts/BabylonCore';
import ListingRestrictionsStruct = IBabylonCore.ListingRestrictionsStruct;
import {MerkleTree} from "merkletreejs";
import keccak256 from "keccak256";

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
let allowlistMerkleTree: MerkleTree;

let nft: Contract, nftFactory;

describe('BabylonCore.sol', function () {
    this.timeout(3000000);
    describe('set up', function () {
        it('#deployment', async () => {
            [deployer, user1, user2] = await ethers.getSigners();

            mintPassFactory = await ethers.getContractFactory('BabylonMintPass', deployer);
            mintPass = await mintPassFactory.deploy();

            controllerFactory = await ethers.getContractFactory('TokensController', deployer);
            controller = await controllerFactory.deploy(mintPass.address);

            editionsExtensionFactory = await ethers.getContractFactory('BabylonEditionsExtension', deployer);
            editionsExtension = await editionsExtensionFactory.deploy();

            mockRandomProviderFactory = await ethers.getContractFactory('MockRandomProvider', deployer);
            mockRandomProvider = await mockRandomProviderFactory.deploy();

            nftFactory = await ethers.getContractFactory('GenericERC721');
            nft = await nftFactory.deploy('Generic', 'GEN', 'ipfs://cid/');
        });

        it('#initialize', async function () {
            let treasury = deployer.address;

            coreFactory = await ethers.getContractFactory('BabylonCore', deployer);

            core = await coreFactory.deploy();
            await core.initialize(
                controller.address,
                mockRandomProvider.address,
                editionsExtension.address,
                treasury
            );

            expect(await core.getTokensController()).to.be.equal(controller.address);
            expect(await core.getRandomProvider()).to.be.equal(mockRandomProvider.address);
            expect(await core.getEditionsExtension()).to.be.equal(editionsExtension.address);
            expect(await core.getTreasury()).to.be.equal(treasury);
            expect(await core.BASIS_POINTS()).to.be.equal(10000);

            await mockRandomProvider.setBabylonCore(core.address);
            await controller.setBabylonCore(core.address);
            await editionsExtension.setBabylonCore(core.address);
        });
    });

    describe('#listing 1', function () {
        it('should start listing', async () => {
            let item: IBabylonCore.ListingItemStruct;
            let edition: IEditionsExtension.EditionInfoStruct;
            let restrictions: ListingRestrictionsStruct;
            let timeStart = 0;
            let tokenId = 1;
            let amount = 1;
            let price = ethers.utils.parseUnits("1", 18);
            let totalTickets = 5;
            let donationBps = 500; //5%
            let editionRoyaltiesBps = 1000; //10%
            let editionName = "Artist on Babylon";
            let editionURI = "ipfs://CID/metadata.json";

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            };

            edition = {
                royaltiesBps: editionRoyaltiesBps,
                name: editionName,
                editionURI: editionURI
            };

            restrictions = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: totalTickets
            }

            await nft.mint(1);
            let owner = await nft.ownerOf(tokenId);
            expect(owner).to.be.eq(deployer.address);

            await nft.approve(controller.address, tokenId);

            await core.startListing(
                item,
                edition,
                restrictions,
                timeStart,
                price,
                totalTickets,
                donationBps
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
            expect(info.timeStart).to.be.gt(0);
            expect(info.price).to.be.eq(price);
            expect(info.totalTickets).to.be.eq(totalTickets);
            expect(info.currentTickets).to.be.eq(0);
            expect(info.donationBps).to.be.eq(donationBps);
            expect(info.randomRequestId).to.be.eq(0);

            mintPass = await ethers.getContractAt('BabylonMintPass', info.mintPass, user1);
            let editionsCollection = await editionsExtension.getEditionsCollection(newId);
            manifoldCreator = await ethers.getContractAt('IERC721Metadata', editionsCollection, deployer);
            expect(await manifoldCreator.name()).to.be.eq(editionName);
        });

        it('should not start a duplicate listing for a same nft', async () => {
            let item: IBabylonCore.ListingItemStruct;
            let edition: IEditionsExtension.EditionInfoStruct;
            let restrictions: ListingRestrictionsStruct;

            let timeStart = 0;
            let tokenId = 1;
            let amount = 1;
            let price = ethers.utils.parseUnits("10", 18);
            let totalTickets = 5;
            let donationBps = 500; //5%
            let editionRoyaltiesBps = 1000; //10%
            let editionName = "Duplicate on Babylon";
            let editionURI = "ipfs://CID/metadata.json";

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            };

            edition = {
                royaltiesBps: editionRoyaltiesBps,
                name: editionName,
                editionURI: editionURI
            };

            restrictions = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: totalTickets
            }

            await expect(core.startListing(
                item,
                edition,
                restrictions,
                timeStart,
                price,
                totalTickets,
                donationBps
            )).to.be.revertedWith("BabylonCore: Active listing for this token already exists");
        });

        it('should participate (3/5 tickets)', async () => {
            let listingId = 1;
            let numTickets = 3;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await core.connect(user1).participate(
                listingId,
                numTickets,
                [],
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
                [],
                {
                    value: price.mul(numTickets)
                }
            )).to.be.revertedWith("BabylonCore: No available tickets");
        });

        it('should not participate with less ETH total price', async () => {
            let listingId = 1;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;

            await expect(core.connect(user2).participate(
                listingId,
                numTickets,
                [],
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
                [],
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
                [],
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

        it('creator should not cancel resolving listing if random is not overdue', async () => {
            let listingId = 1;

            expect(await mockRandomProvider.overdue()).to.be.eq(false);
            await expect(core.connect(deployer).cancelListing(listingId))
                .to.be.revertedWith("BabylonCore: Random is not overdue");
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
            let edition: IEditionsExtension.EditionInfoStruct;
            let restrictions: ListingRestrictionsStruct;
            let timeStart = 0;
            let tokenId = 2;
            let amount = 1;
            let price = ethers.utils.parseUnits("2", 18);
            let totalTickets = 10;
            let donationBps = 500; //5%
            let editionRoyaltiesBps = 1000; //10%
            let editionName = "Artist on Babylon";
            let editionURI = "ipfs://CID/metadata.json";

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            };

            edition = {
                royaltiesBps: editionRoyaltiesBps,
                name: editionName,
                editionURI: editionURI
            };

            restrictions = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: totalTickets
            }

            await nft.connect(user1).mint(1);
            let owner = await nft.ownerOf(tokenId);
            expect(owner).to.be.eq(user1.address);

            await nft.connect(user1).approve(controller.address, tokenId);

            await core.connect(user1).startListing(
                item,
                edition,
                restrictions,
                timeStart,
                price,
                totalTickets,
                donationBps
            );

            let newId = await core.getListingId(nft.address, tokenId);
            expect(newId).to.be.eq(2);

            let info = await core.getListingInfo(newId);
            mintPass = await ethers.getContractAt('BabylonMintPass', info.mintPass, user1);
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
                [],
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
                [],
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

        it('participant should not refund twice', async () => {
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

    describe('#listing with restrictions', function () {
        it('should start listing', async () => {
            let item: IBabylonCore.ListingItemStruct;
            let edition: IEditionsExtension.EditionInfoStruct;
            let restrictions: ListingRestrictionsStruct;
            let timeStart = 0;
            let tokenId = 3;
            let amount = 1;
            let price = ethers.utils.parseUnits("1", 18);
            let totalTickets = 10;
            let donationBps = 500; //5%
            let editionRoyaltiesBps = 1000; //10%
            let editionName = "Some Artist on Babylon";
            let editionURI = "ipfs://CID/metadata.json";

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            };

            edition = {
                royaltiesBps: editionRoyaltiesBps,
                name: editionName,
                editionURI: editionURI
            };

            const allowlist = [
                deployer.address,
                user1.address
            ];

            allowlistMerkleTree = new MerkleTree(
                allowlist,
                keccak256,
                {
                    hashLeaves: true,
                    sortPairs: true
                }
            );

            restrictions = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(),
                reserved: totalTickets, //only allowlist members will be able to participate
                mintedFromReserve: 0,
                maxPerAddress: 2
            }

            await nft.mint(1);
            let owner = await nft.ownerOf(tokenId);
            expect(owner).to.be.eq(deployer.address);

            await nft.approve(controller.address, tokenId);

            await core.startListing(
                item,
                edition,
                restrictions,
                timeStart,
                price,
                totalTickets,
                donationBps
            );

            let newId = await core.getListingId(nft.address, tokenId);
            expect(newId).to.be.eq(3);
            let newListingRestrictions = await core.getListingRestrictions(newId);
            expect(newListingRestrictions.allowlistRoot).to.be.eq(restrictions.allowlistRoot);
            expect(newListingRestrictions.reserved).to.be.eq(restrictions.reserved);
            expect(newListingRestrictions.mintedFromReserve).to.be.eq(restrictions.mintedFromReserve);
            expect(newListingRestrictions.maxPerAddress).to.be.eq(restrictions.maxPerAddress);

            let info = await core.getListingInfo(newId);
            mintPass = await ethers.getContractAt("BabylonMintPass", info.mintPass, user1);
        });

        it('should not participate if not in the allowlist and no public tickets left', async () => {
            let listingId = 3;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            let proof = ['0xbc245e90a16847e10fbabc5e1795022788add4639228506c5bb62adcdf81b161']; //some wrong proof
            expect(info.state).to.be.eq(0); // Active

            await expect(core.connect(user2).participate(
                listingId,
                numTickets,
                proof,
                {
                    value: price.mul(numTickets)
                }
            )).to.be.revertedWith("No available tickets outside the allowlist");
        });

        it('should participate from the allowlist', async () => {
            let listingId = 3;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            let participationsOfUser = await core.getListingParticipations(listingId, user1.address);
            let proof = allowlistMerkleTree.getHexProof(keccak256(user1.address));

            expect(info.state).to.be.eq(0); // Active
            expect(participationsOfUser).to.be.eq(0);

            await core.connect(user1).participate(
                listingId,
                numTickets,
                proof,
                {
                    value: price.mul(numTickets)
                }
            );

            let amount = await mintPass.balanceOf(user1.address);
            info = await core.getListingInfo(listingId);
            participationsOfUser = await core.getListingParticipations(listingId, user1.address);
            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(amount).to.be.eq(numTickets);
            expect(info.currentTickets).to.be.eq(numTickets);
            expect(participationsOfUser).to.be.eq(numTickets);
            expect(listingRestrictions.mintedFromReserve).to.be.eq(numTickets);
        });

        it('listing creator should update the restrictions', async () => {
            let listingId = 3;
            let info = await core.getListingInfo(listingId);
            let oldRestrictions: ListingRestrictionsStruct = await core.getListingRestrictions(listingId);

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(), //doesn't change
                reserved: info.totalTickets - 5, //there will be 5 mint passes available to everyone
                mintedFromReserve: 0, //this will not be overridden in contract anyway
                maxPerAddress: 2 //doesn't change
            };

            await core.updateListingRestrictions(
                listingId,
                newRestrictions
            );

            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(listingRestrictions.mintedFromReserve).to.be.eq(oldRestrictions.mintedFromReserve);
            expect(listingRestrictions.allowlistRoot).to.be.eq(newRestrictions.allowlistRoot);
            expect(listingRestrictions.reserved).to.be.eq(newRestrictions.reserved);
            expect(listingRestrictions.maxPerAddress).to.be.eq(newRestrictions.maxPerAddress);
        });

        it('not the creator should not update the listing restrictions', async () => {
            let listingId = 3;

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: 1
            };

            await expect(core.connect(user1).updateListingRestrictions(
                    listingId,
                    newRestrictions
                )
            ).to.be.revertedWith("BabylonCore: Only the creator can update the restrictions");
        });

        it('update of the maxPerAddress out of bounds should correct down to the totalTickets', async () => {
            let listingId = 3;
            let info = await core.getListingInfo(listingId);

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(), //doesn't change
                reserved: 5,
                mintedFromReserve: 0,
                maxPerAddress: 100 //more than total tickets
            };

            await core.updateListingRestrictions(
                listingId,
                newRestrictions
            );

            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(listingRestrictions.maxPerAddress).to.be.eq(info.totalTickets);
        });

        it('update of the reserve out of bounds should correct down to the current ceiling', async () => {
            let listingId = 3;
            let info = await core.getListingInfo(listingId);
            let oldRestrictions: ListingRestrictionsStruct = await core.getListingRestrictions(listingId);

            let reserveCeiling = (info.totalTickets.sub(info.currentTickets)).add(oldRestrictions.mintedFromReserve);

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(), //doesn't change
                reserved: 100, //more than total tickets
                mintedFromReserve: 0,
                maxPerAddress: 4 //doesn't change
            };

            await core.updateListingRestrictions(
                listingId,
                newRestrictions
            );

            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(listingRestrictions.reserved).to.be.eq(reserveCeiling);
        });

        it('update of the reserve out of bounds should correct up to the current floor', async () => {
            let listingId = 3;
            let oldRestrictions: ListingRestrictionsStruct = await core.getListingRestrictions(listingId);

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(), //doesn't change
                reserved: 0, //less than already minted from reserve
                mintedFromReserve: 0,
                maxPerAddress: 4 //doesn't change
            };

            await core.updateListingRestrictions(
                listingId,
                newRestrictions
            );

            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(listingRestrictions.reserved).to.be.eq(oldRestrictions.mintedFromReserve);
        });

        it('update of the listing restrictions emits event', async () => {
            let listingId = 3;
            let info = await core.getListingInfo(listingId);
            let oldRestrictions: ListingRestrictionsStruct = await core.getListingRestrictions(listingId);

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(), //doesn't change
                reserved: info.totalTickets - 7, //there will be 7 mint passes available to everyone
                mintedFromReserve: 0, //this will not be overridden in contract anyway
                maxPerAddress: 4 //now 4 per address
            };

            await expect(core.updateListingRestrictions(
                    listingId,
                    newRestrictions
                )
            ).to.emit(core, 'ListingRestrictionsUpdated');

            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(listingRestrictions.mintedFromReserve).to.be.eq(oldRestrictions.mintedFromReserve);
            expect(listingRestrictions.allowlistRoot).to.be.eq(newRestrictions.allowlistRoot);
            expect(listingRestrictions.reserved).to.be.eq(newRestrictions.reserved);
            expect(listingRestrictions.maxPerAddress).to.be.eq(newRestrictions.maxPerAddress);
        });

        it('should participate and get both allowlist and public tickets', async () => {
            let listingId = 3;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            let participationsOfUser = await core.getListingParticipations(listingId, user1.address);
            let previousParticipation = participationsOfUser;
            let proof = allowlistMerkleTree.getHexProof(keccak256(user1.address));

            expect(info.state).to.be.eq(0); // Active

            await core.connect(user1).participate(
                listingId,
                numTickets,
                proof,
                {
                    value: price.mul(numTickets)
                }
            );

            let amount = await mintPass.balanceOf(user1.address);
            info = await core.getListingInfo(listingId);
            participationsOfUser = await core.getListingParticipations(listingId, user1.address);
            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(amount).to.be.eq(previousParticipation.add(numTickets));
            expect(info.currentTickets).to.be.eq(previousParticipation.add(numTickets));
            expect(participationsOfUser).to.be.eq(previousParticipation.add(numTickets));
            expect(listingRestrictions.mintedFromReserve).to.be.eq(listingRestrictions.reserved);
        });

        it('should participate not from the allowlist if there are tickets for the public', async () => {
            let listingId = 3;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            let currentTicketsBefore = info.currentTickets;
            let participationsOfUser = await core.getListingParticipations(listingId, user2.address);
            let proof = allowlistMerkleTree.getHexProof(keccak256(user2.address));

            expect(info.state).to.be.eq(0); // Active
            expect(participationsOfUser).to.be.eq(0);

            await core.connect(user2).participate(
                listingId,
                numTickets,
                proof,
                {
                    value: price.mul(numTickets)
                }
            );

            let amount = await mintPass.balanceOf(user2.address);
            info = await core.getListingInfo(listingId);
            participationsOfUser = await core.getListingParticipations(listingId, user2.address);
            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(amount).to.be.eq(numTickets);
            expect(info.currentTickets).to.be.eq(currentTicketsBefore.add(numTickets));
            expect(participationsOfUser).to.be.eq(numTickets);
            expect(listingRestrictions.mintedFromReserve).to.be.eq(listingRestrictions.reserved); //not counted here
        });

        it('listing creator should extend an allowlist reserve within range', async () => {
            let listingId = 3;
            let info = await core.getListingInfo(listingId);
            let oldRestrictions: ListingRestrictionsStruct = await core.getListingRestrictions(listingId);

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: allowlistMerkleTree.getHexRoot(), //doesn't change
                reserved: info.totalTickets - 6, //there will be 4 mint passes available to everyone
                mintedFromReserve: 0, //this will not be overridden in contract anyway
                maxPerAddress: 4 //doesn't change
            };

            await core.updateListingRestrictions(
                listingId,
                newRestrictions
            );

            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(listingRestrictions.mintedFromReserve).to.be.eq(oldRestrictions.mintedFromReserve);
            expect(listingRestrictions.allowlistRoot).to.be.eq(newRestrictions.allowlistRoot);
            expect(listingRestrictions.reserved).to.be.eq(newRestrictions.reserved);
            expect(listingRestrictions.maxPerAddress).to.be.eq(newRestrictions.maxPerAddress);
        });

        it('should participate from the allowlist after reserve extension', async () => {
            let listingId = 3;
            let numTickets = 4;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            let participationsOfUser = await core.getListingParticipations(listingId, deployer.address);
            let previousParticipation = participationsOfUser;
            let proof = allowlistMerkleTree.getHexProof(keccak256(deployer.address));

            expect(info.state).to.be.eq(0); // Active

            await core.participate(
                listingId,
                numTickets,
                proof,
                {
                    value: price.mul(numTickets)
                }
            );

            let amount = await mintPass.balanceOf(deployer.address);
            info = await core.getListingInfo(listingId);
            participationsOfUser = await core.getListingParticipations(listingId, deployer.address);
            let listingRestrictions = await core.getListingRestrictions(listingId);
            expect(amount).to.be.eq(previousParticipation.add(numTickets));
            expect(info.currentTickets).to.be.eq(info.totalTickets);
            expect(participationsOfUser).to.be.eq(previousParticipation.add(numTickets));
            expect(listingRestrictions.mintedFromReserve).to.be.eq(listingRestrictions.reserved);
        });

        it('should not update the listing restrictions of the Resolving listing', async () => {
            let listingId = 3;
            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(1); // Resolving

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: 1
            };

            await expect(core.updateListingRestrictions(
                    listingId,
                    newRestrictions
                )
            ).to.be.revertedWith("BabylonCore: Listing state should be active");
        });

        it('should not update the listing restrictions of the Successful listing', async () => {
            let listingId = 3;

            //Resolving -> Successful
            await mockRandomProvider.fulfillRandomWords(
                listingId,
                [5]
            );

            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(2); // Successful

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: 1
            };

            await expect(core.updateListingRestrictions(
                    listingId,
                    newRestrictions
                )
            ).to.be.revertedWith("BabylonCore: Listing state should be active");
        });

        it('should not update the listing restrictions of the Finalized listing', async () => {
            let listingId = 3;

            //Successful -> Finalized
            await core.transferETHToCreator(listingId);

            let info = await core.getListingInfo(listingId);
            expect(info.state).to.be.eq(3); // Finalized

            let newRestrictions: ListingRestrictionsStruct = {
                allowlistRoot: constants.HashZero,
                reserved: 0,
                mintedFromReserve: 0,
                maxPerAddress: 1
            };

            await expect(core.updateListingRestrictions(
                    listingId,
                    newRestrictions
                )
            ).to.be.revertedWith("BabylonCore: Listing state should be active");
        });
    });
})

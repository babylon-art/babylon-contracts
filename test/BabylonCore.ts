import hre from 'hardhat';
import chai from 'chai';

import {Contract, constants, utils} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {solidity} from 'ethereum-waffle';

import {
    NFT_COLLECTION,
} from './utils';
import {IBabylonCore} from "../typechain/contracts/babylon/BabylonCore";

const { ethers } = hre;

chai.use(solidity);
const {expect} = chai;

let deployer: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

let core: Contract, coreFactory;
let controller: Contract, controllerFactory;
let randomProvider: Contract, randomProviderFactory;

let nft: Contract;

describe('BabylonCore', function () {
    this.timeout(3000000);
    describe('set up', function () {
        it('#deployment', async () => {
            [deployer, user1, user2] = await ethers.getSigners();
            coreFactory = await ethers.getContractFactory('BabylonCore', deployer);
            core = await coreFactory.deploy();
            await core.deployed();

            controllerFactory = await ethers.getContractFactory('TokensController', deployer);
            controller = await controllerFactory.deploy();
            await controller.deployed();

            randomProviderFactory = await ethers.getContractFactory('RandomProvider', deployer);

            //TODO test without real random
            randomProvider = await randomProviderFactory.deploy(core.address, 0);
            await randomProvider.deployed();

            nft = await ethers.getContractAt('IERC721', NFT_COLLECTION, deployer);
        });

        it('#initialize', async function () {
            await core.initialize(controller.address, randomProvider.address);

            expect(await core.getTokensController()).to.be.equal(controller.address);
            expect(await core.getRandomProvider()).to.be.equal(randomProvider.address);
        });
    });

    describe('#listing 0', function () {
        it('should start listing', async () => {
            let item: IBabylonCore.ListingItemStruct;
            let timeStart = 0;
            let tokenId = 1;
            let amount = 1;
            let price = ethers.utils.parseUnits("1", 18);
            let totalTickets = 5;

            item = {
                itemType: 0, //ERC721
                token: nft.address,
                identifier: tokenId,
                amount: amount
            }

            await nft.approve(controller.address, tokenId);

            await core.startListing(
                item,
                timeStart,
                price,
                totalTickets
            );

            let newId = await core.getListingId(nft.address, tokenId);
            expect(newId).to.be.eq(0);

            let info = await core.getListingInfo(newId);
            expect(info.item.itemType).to.be.eq(0);
            expect(info.item.token).to.be.eq(nft.address);
            expect(info.item.identifier).to.be.eq(tokenId);
            expect(info.item.amount).to.be.eq(amount);

            expect(info.creator).to.be.eq(deployer.address);
            expect(info.claimer).to.be.eq(ethers.constants.AddressZero);
            expect(info.price).to.be.eq(price);
            expect(info.timeStart).to.be.eq(timeStart);
            expect(info.totalTickets).to.be.eq(totalTickets);
            expect(info.currentTickets).to.be.eq(0);
        });

        it('should participate (3/5 tickets)', async () => {
            let listingId = 0;
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

            let participationInfo = await core.getParticipation(user1.address, listingId);
            expect(participationInfo.amount).to.be.eq(numTickets);
            expect(participationInfo.refunded).to.be.eq(false);
            info = await core.getListingInfo(listingId);
            expect(info.currentTickets).to.be.eq(numTickets);

            expect(await core.getParticipantById(listingId, 0)).to.be.eq(user1.address);
            expect(await core.getParticipantById(listingId, 1)).to.be.eq(user1.address);
            expect(await core.getParticipantById(listingId, 2)).to.be.eq(user1.address);
            expect(await core.getParticipantById(listingId, 3)).to.be.eq(ethers.constants.AddressZero);
        });

        it('should participate (5/5 tickets)', async () => {
            let listingId = 0;
            let numTickets = 2;
            let info = await core.getListingInfo(listingId);
            let price = info.price;
            console.log(user2.address);

            await core.connect(user2).participate(
                listingId,
                numTickets,
                {
                    value: price.mul(numTickets)
                }
            );

            let participationInfo = await core.getParticipation(user2.address, listingId);
            expect(participationInfo.amount).to.be.eq(numTickets);
            expect(participationInfo.refunded).to.be.eq(false);
            info = await core.getListingInfo(listingId);
            expect(info.currentTickets).to.be.eq(info.totalTickets);

            expect(await core.getParticipantById(listingId, 3)).to.be.eq(user2.address);
            expect(await core.getParticipantById(listingId, 4)).to.be.eq(user2.address);
        });
    });

})

import hre from 'hardhat';
import chai from 'chai';

import {Contract, BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {solidity} from 'ethereum-waffle';

import {
    compareBigNumberArrays,
    generateNewSigner,
    labelhash,
    mineNSeconds
} from './utils';

const { ethers } = hre;

chai.use(solidity);
const {expect} = chai;

let deployer: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

let affiliateController: Contract, affiliateFactory;
let mockCore: Contract, mockCoreFactory;
let referralTimeframe: number;
let amounts;
let payoutBPS;
let promocode: string, promocodeNode: string;
let promocode2: string, promocodeNode2: string;
let donation: BigNumber;
let previousPayoutTimestamp: BigNumber;

describe('BabylonCore.sol', function () {
    this.timeout(3000000);
    describe('set up', function () {
        it('#deployment', async () => {
            [deployer, user1, user2] = await ethers.getSigners();

            affiliateFactory = await ethers.getContractFactory('AffiliateController', user2);
            affiliateController = await affiliateFactory.deploy();

            mockCoreFactory = await ethers.getContractFactory('MockCoreReferral', deployer);
            mockCore = await mockCoreFactory.deploy(affiliateController.address);
        });

        it('#initialize', async function () {
            referralTimeframe = 2592000; // 30 days

            amounts = [
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("20")
            ];

            payoutBPS = [
                BigNumber.from("1000"),
                BigNumber.from("1500"),
                BigNumber.from("2000"),
                BigNumber.from("2500")
            ];

            await affiliateController.initialize(deployer.address, referralTimeframe, amounts, payoutBPS);

            expect(await affiliateController.getBabylonCore()).to.be.eq(deployer.address);
            expect(await affiliateController.getReferralTimeframe()).to.be.eq(referralTimeframe);
            let amountsAndBPS = await affiliateController.getAmountsAndBPS();
            expect(compareBigNumberArrays(amounts, amountsAndBPS[0])).to.be.eq(true);
            expect(compareBigNumberArrays(payoutBPS, amountsAndBPS[1])).to.be.eq(true);
        });
    });

    describe('#registerReferrer', function () {
        it('should register a promo code', async () => {
            promocode = "referrerisme"
            promocodeNode = labelhash(promocode);
            expect(await affiliateController.getCodeNode(user2.address)).to.be.eq(ethers.constants.HashZero);

            await affiliateController.registerReferrer(promocode);

            let info = await affiliateController.getReferrerInfo(promocodeNode);
            expect(await affiliateController.getCodeNode(user2.address)).to.be.eq(promocodeNode);
            expect(info.referrer).to.be.eq(user2.address);
            expect(info.generated).to.be.eq(0);
            expect(info.lastPayoutTimestamp).to.be.eq(0);
            expect(info.code).to.be.eq(promocode);
        });

        it('should not register a referrer with a short promo code', async () => {
            await expect(affiliateController.registerReferrer("ab")) //code less than 3 characters
                .to.be.revertedWith("AffiliateController: Code too short");
        });

        it('should not register referrer with a short promo code', async () => {
            await expect(affiliateController.registerReferrer("ab")) //code less than 2 characters
                .to.be.revertedWith("AffiliateController: Code too short");
        });

        it('should not register the same referrer again', async () => {
            await expect(affiliateController.registerReferrer("abc"))
                .to.be.revertedWith("AffiliateController: Referrer already registered");
        });

        it('should not register the taken promo code', async () => {
            await expect(affiliateController.connect(user1).registerReferrer(promocode))
                .to.be.revertedWith("AffiliateController: Code already taken");
        });

        it('should emit event when a new referrer is registered', async () => {
            promocode2 = "newpromocode";
            promocodeNode2 = labelhash(promocode2);

            await expect(affiliateController.connect(user1).registerReferrer(promocode2))
                .to.emit(affiliateController, 'ReferrerRegistered')
                .withArgs(promocodeNode2, promocode2, user1.address);
        });
    });

    describe('#registerReferee', function () {
        it('should register a referee with codeNode', async () => {
            expect(await affiliateController.getReferrer(deployer.address)).to.be.eq(ethers.constants.HashZero);

            await affiliateController.connect(deployer).registerReferee(promocodeNode, deployer.address);

            expect(await affiliateController.getReferrer(deployer.address)).to.be.eq(promocodeNode);
        });

        it('not BabylonCore should not register a referee', async () => {
            await expect(affiliateController.registerReferee(promocodeNode, deployer.address))
                .to.be.revertedWith("AffiliateController: Only BabylonCore can register");
        });

        it('should not register the same referee again', async () => {
            await expect(affiliateController.connect(deployer).registerReferee(promocodeNode2, deployer.address))
                .to.be.revertedWith("AffiliateController: Referee already registered");
        });

        it('should not register the same referee again even with the already entered code', async () => {
            await expect(affiliateController.connect(deployer).registerReferee(promocodeNode, deployer.address))
                .to.be.revertedWith("AffiliateController: Referee already registered");
        });

        it('should not register a referee with nonexistent codeNode', async () => {
            let newSigner = await generateNewSigner();

            await expect(affiliateController.connect(deployer).registerReferee(labelhash("new"), newSigner.address))
                .to.be.revertedWith("AffiliateController: Invalid code");
        });

        it('should not register oneself as a referee', async () => {
            await expect(affiliateController.connect(deployer).registerReferee(promocodeNode, user2.address))
                .to.be.revertedWith("AffiliateController: Cannot refer oneself");
        });

        it('should emit event when a new referee is registered', async () => {
            let newSigner = await generateNewSigner();

            await expect(affiliateController.connect(deployer).registerReferee(promocodeNode2, newSigner.address))
                .to.emit(affiliateController, 'RefereeRegistered')
                .withArgs(promocodeNode2, newSigner.address);
        });
    });

    describe('#getReferrerBPS', function () {
        it('should set mock contract as the BabylonCore', async () => {
            await affiliateController.connect(user2).setBabylonCore(mockCore.address);

            expect(await affiliateController.getBabylonCore()).to.be.eq(mockCore.address);
        });

        it('should get 0 BPS for non-referee', async () => {
            let newSigner = await generateNewSigner();
            donation = ethers.utils.parseEther("1");

            await mockCore.invokeGetReferrerBPS(newSigner.address, donation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(0);
            expect(await mockCore.lastReferrer()).to.be.eq(ethers.constants.AddressZero);
        });

        it('should get first tier BPS', async () => {
            donation = ethers.utils.parseEther("1");

            await mockCore.invokeGetReferrerBPS(deployer.address, donation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(1000);
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            previousPayoutTimestamp = BigNumber.from(0);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should get second tier BPS when crossing it', async () => {
            let newDonation = ethers.utils.parseEther("5");
            donation = donation.add(newDonation);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("1500"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should get second tier BPS', async () => {
            let newDonation = ethers.utils.parseEther("2");
            donation = donation.add(newDonation);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("1500"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should get third tier BPS when crossing it', async () => {
            let newDonation = ethers.utils.parseEther("3");
            donation = donation.add(newDonation);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("2000"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should get third tier BPS', async () => {
            let newDonation = ethers.utils.parseEther("8");
            donation = donation.add(newDonation);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("2000"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should get fourth tier BPS when crossing it', async () => {
            let newDonation = ethers.utils.parseEther("4");
            donation = donation.add(newDonation);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("2500"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should get fourth tier BPS', async () => {
            let newDonation = ethers.utils.parseEther("25");
            donation = donation.add(newDonation);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("2500"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });

        it('should lose BPS tier after 1 month of inactivity', async () => {
            let newDonation = ethers.utils.parseEther("1");

            await mineNSeconds((await affiliateController.getReferralTimeframe()).toNumber());

            let referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(donation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.eq(previousPayoutTimestamp);

            await mockCore.invokeGetReferrerBPS(deployer.address, newDonation);

            expect(await mockCore.lastReferrerBPS()).to.be.eq(BigNumber.from("1000"));
            expect(await mockCore.lastReferrer()).to.be.eq(user2.address);

            referrerInfo = await affiliateController.getReferrerInfo(promocodeNode);
            expect(referrerInfo.generated).to.be.eq(newDonation);
            expect(referrerInfo.lastPayoutTimestamp).to.be.gt(previousPayoutTimestamp);
            previousPayoutTimestamp = referrerInfo.lastPayoutTimestamp;
        });
    });

    describe('#setAmountsAndBPS', function () {
        it('should set new amounts and BPS', async () => {
            amounts = [
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("20"),
                ethers.utils.parseEther("30")
            ];

            payoutBPS = [
                BigNumber.from("2000"),
                BigNumber.from("2500"),
                BigNumber.from("3000"),
                BigNumber.from("3500")
            ];

            await affiliateController.connect(user2).setAmountsAndBPS(amounts, payoutBPS);

            let amountsAndBPS = await affiliateController.getAmountsAndBPS();
            expect(compareBigNumberArrays(amounts, amountsAndBPS[0])).to.be.eq(true);
            expect(compareBigNumberArrays(payoutBPS, amountsAndBPS[1])).to.be.eq(true);
        });

        it('should set new amounts and BPS that are more tiers than before', async () => {
            amounts = [
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("20"),
                ethers.utils.parseEther("30")
            ];

            payoutBPS = [
                BigNumber.from("1000"),
                BigNumber.from("2000"),
                BigNumber.from("2500"),
                BigNumber.from("3000"),
                BigNumber.from("3500")
            ];

            await affiliateController.connect(user2).setAmountsAndBPS(amounts, payoutBPS);

            let amountsAndBPS = await affiliateController.getAmountsAndBPS();
            expect(compareBigNumberArrays(amounts, amountsAndBPS[0])).to.be.eq(true);
            expect(compareBigNumberArrays(payoutBPS, amountsAndBPS[1])).to.be.eq(true);
        });

        it('should set new amounts and BPS that are fewer tiers than before', async () => {
            amounts = [
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("10")
            ];

            payoutBPS = [
                BigNumber.from("1000"),
                BigNumber.from("2000"),
                BigNumber.from("2500")
            ];

            await affiliateController.connect(user2).setAmountsAndBPS(amounts, payoutBPS);

            let amountsAndBPS = await affiliateController.getAmountsAndBPS();
            expect(compareBigNumberArrays(amounts, amountsAndBPS[0])).to.be.eq(true);
            expect(compareBigNumberArrays(payoutBPS, amountsAndBPS[1])).to.be.eq(true);
        });
    });
})

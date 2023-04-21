import hre from 'hardhat';
import { BigNumber } from 'ethers';

const { ethers } = hre;

type Amount = string | bigint | BigNumber;

export async function balanceOfETH(walletAddress: string) {
    return await ethers.provider.getBalance(walletAddress);
}

export async function impersonatedTransferFromETH(token: string, from: string, to: string, amount: Amount) {
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [from],
    });

    const signer = await ethers.provider.getSigner(from);
    const tx = await signer.sendTransaction({
        to: to,
        value: amount,
    });
    await tx.wait();

    await hre.network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [from],
    });
}

export async function generateNewSigner() {
    let signer = ethers.Wallet.createRandom();
    signer =  signer.connect(ethers.provider);
    await hre.network.provider.send("hardhat_setBalance", [
        signer.address,
        "0x1000",
    ]);

    return signer;
}

export async function getCurrentBlockTimestamp() {
    const latestBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    return latestBlock.timestamp;
}

export async function getSnapshot() {
    return await hre.network.provider.request({ method: 'evm_snapshot', params: [] });
}

export async function revertToSnapshot(id: any) {
    await hre.network.provider.request({ method: 'evm_revert', params: [id] });
}

export async function mineNSeconds(seconds: number) {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    return await ethers.provider.send('evm_mine', []);
}

export function compareBigNumberArrays(a: BigNumber[], b: BigNumber[]) {
    return a.length === b.length && a.every((element: BigNumber, index: number) => element.eq(b[index]));
}
export function labelhash(label: string) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label));
}

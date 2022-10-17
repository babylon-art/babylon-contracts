import hre from 'hardhat';
import { BigNumber } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

const { ethers } = hre;

type Amount = string | bigint | BigNumber;

export async function approve(token: string, from: string | number, to: string, amount: Amount) {
    const signer = await ethers.provider.getSigner(from);
    const erc20 = new ethers.Contract(token, ERC20.abi, signer);
    await erc20.approve(to, amount);
}

export async function allowance(token: string, from: string | number, to: string) {
    const signer = (await ethers.getSigners())[0];
    const erc20 = new ethers.Contract(token, ERC20.abi, signer);
    return await erc20.allowance(from, to);
}

export async function balanceOfErc20(token: string, of: string) {
    const signer = (await ethers.getSigners())[0];
    const erc20 = new ethers.Contract(token, ERC20.abi, signer);
    return await erc20.balanceOf(of);
}

export async function balanceOfETH(walletAddress: string) {
    return await ethers.provider.getBalance(walletAddress);
}

export async function transferErc20(token: string, from: string | number, to: string, amount: Amount) {
    const signer = await ethers.provider.getSigner(from);
    const erc20 = new ethers.Contract(token, ERC20.abi, signer);
    await erc20.transfer(to, amount);
}

export async function impersonatedTransferFromErc20(token: string, from: string, to: string, amount: Amount) {
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [from],
    });

    await transferErc20(token, from, to, amount);

    await hre.network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [from],
    });
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

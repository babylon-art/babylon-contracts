import {config as dotEnvConfig} from 'dotenv';
import {HardhatUserConfig} from 'hardhat/types';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';

dotEnvConfig();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const ALCHEMY_GOERLI_KEY = process.env.ALCHEMY_GOERLI_KEY || "";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2 || "";
const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3 || "";
import './scripts';

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    solidity: {
        compilers: [
            {
                version: "0.8.10",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
        ]
    },
    networks: {
        hardhat: {
            forking: {
                enabled: true,
                url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_GOERLI_KEY}`,
                blockNumber: 7995175
            },
            accounts: [
                {
                    privateKey: PRIVATE_KEY, balance: "10000000000000000000000",
                },
                {
                    privateKey: PRIVATE_KEY_2, balance: "10000000000000000000000",
                },
                {
                    privateKey: PRIVATE_KEY_3, balance: "10000000000000000000000",
                }
            ]
        },
        mainnet: {
            url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
            accounts: [PRIVATE_KEY, PRIVATE_KEY_2],
        },
        goerli: {
            url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_GOERLI_KEY}`,
            accounts: [PRIVATE_KEY, PRIVATE_KEY_2, PRIVATE_KEY_3],
        },
        local: {
            url: "http://127.0.0.1:8545",
            accounts: [PRIVATE_KEY, PRIVATE_KEY_2, PRIVATE_KEY_3],
            timeout: 100000
        }
    },
    etherscan: {
        apiKey: {
            mainnet: ETHERSCAN_API_KEY,
            goerli: ETHERSCAN_API_KEY,
        }
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    typechain: {
        outDir: 'typechain',
        target: 'ethers-v5',
    },
    mocha: {
        timeout: 80000
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: false,
    },
    gasReporter: {
        currency: 'USD'
    }
};

export default config;

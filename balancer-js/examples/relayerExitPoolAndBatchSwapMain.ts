import dotenv from 'dotenv';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import {
    BalancerSDK,
    Network,
    ConfigSdk,
    SUBGRAPH_URLS,
    StablePoolEncoder,
} from '../src/index';
import { AAVE_DAI, AAVE_USDT, STABAL3PHANTOM } from './constants';

import balancerRelayerAbi from '../src/abi/BalancerRelayer.json';

dotenv.config();

/*
Example showing how to use Relayer to chain exitPool followed by batchSwaps using tokens from exit.
User must approve relayer.
Vault must have approvals for tokens.
*/
async function relayerExitPoolAndBatchSwap() {
    const config: ConfigSdk = {
        network: Network.MAINNET,
        rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
        subgraphUrl: SUBGRAPH_URLS[Network.MAINNET],
    };

    const provider = new JsonRpcProvider(config.rpcUrl);
    const key: any = process.env.TRADER_KEY_MAIN;
    const relayerAddress = '0xac9f49ef3ab0bbc929f7b1bb0a17e1fca5786251';
    const wallet = new Wallet(key, provider);

    const balancer = new BalancerSDK(config);

    /*
    This creates pool request for exactTokensOut.
    Here minAmoutsOut is known because it just matches the exact out amounts.
    maxBptIn should set to a known amount based on pool balances, etc.
    */
    // const exactPoolTokensOut = ['100000', '100000000000000000'];
    // const minExitAmountsOut = exactPoolTokensOut;
    // const maxBptIn = MaxUint256;
    // const userData = StablePoolEncoder.exitBPTInForExactTokensOut(
    //     exactPoolTokensOut,
    //     maxBptIn
    // );

    /*
    This creates pool request for exactBPTIn.
    expectedAmountsOut should be set to a known/realistic value as this is used to estimate swap/limit amounts and can cause issues if off.
    */
    const bptAmountIn = '3000718278197474459';
    const expectedAmountsOut = ['1061200000000000000', '1107900', '846400'];
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(bptAmountIn);

    const txInfo = await balancer.relayer.exitPoolAndBatchSwap({
        exiter: wallet.address, // exiter is address that holds BPT used to exit pool
        swapRecipient: wallet.address, // recipient is address that receives final tokens
        poolId: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063', // staBal3
        exitTokens: [
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ],
        userData,
        expectedAmountsOut: expectedAmountsOut,
        finalTokensOut: [
            '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2',
            '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2',
            '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2',
        ],
        slippage: '50000000000000000', // Slippage for swap 5%
        fetchPools: {
            fetchPools: true,
            fetchOnChain: false,
        },
    });

    const relayerContract = new Contract(
        relayerAddress,
        balancerRelayerAbi,
        provider
    );
    const tx = await relayerContract
        .connect(wallet)
        .callStatic[txInfo.function](txInfo.params, {
            value: '0',
            // gasPrice: '6000000000',
            // gasLimit: '2000000',
        });

    console.log(`Amounts of tokensOut:`);
    console.log(txInfo.outputs.amountsOut.toString());
    console.log(`Swap Deltas:`);
    console.log(defaultAbiCoder.decode(['int256[]'], tx[1]).toString());
}

// TS_NODE_PROJECT='tsconfig.testing.json' ts-node ./examples/relayerExitPoolAndBatchSwapMain.ts
relayerExitPoolAndBatchSwap();

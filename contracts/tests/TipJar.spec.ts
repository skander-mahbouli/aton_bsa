import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { TipJar } from '../build/TipJar/TipJar_TipJar';
import '@ton/test-utils';

describe('TipJar', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let platformWallet: SandboxContract<TreasuryContract>;
    let tipJar: SandboxContract<TipJar>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        platformWallet = await blockchain.treasury('platform');

        tipJar = blockchain.openContract(
            await TipJar.fromInit(platformWallet.address, 500n) // 5% fee
        );

        const deployResult = await tipJar.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tipJar.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy with correct config', async () => {
        const wallet = await tipJar.getPlatformWallet();
        const feeBps = await tipJar.getPlatformFeeBps();
        expect(wallet.equals(platformWallet.address)).toBe(true);
        expect(feeBps).toBe(500n);
    });

    it('should process a tip and split funds', async () => {
        const tipper = await blockchain.treasury('tipper');
        const creator = await blockchain.treasury('creator');

        const platformBalanceBefore = await platformWallet.getBalance();
        const creatorBalanceBefore = await creator.getBalance();

        const result = await tipJar.send(
            tipper.getSender(),
            { value: toNano('1') },
            { $$type: 'TipCreator', creatorAddress: creator.address, videoId: 1n },
        );

        expect(result.transactions).toHaveTransaction({
            from: tipJar.address,
            to: creator.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: tipJar.address,
            to: platformWallet.address,
            success: true,
        });
    });

    it('should reject tips that are too small', async () => {
        const tipper = await blockchain.treasury('tipper');
        const creator = await blockchain.treasury('creator');

        const result = await tipJar.send(
            tipper.getSender(),
            { value: toNano('0.04') },
            { $$type: 'TipCreator', creatorAddress: creator.address, videoId: 1n },
        );

        expect(result.transactions).toHaveTransaction({
            from: tipper.address,
            to: tipJar.address,
            success: false,
        });
    });

    it('should handle large tips', async () => {
        const tipper = await blockchain.treasury('tipper');
        const creator = await blockchain.treasury('creator');

        const result = await tipJar.send(
            tipper.getSender(),
            { value: toNano('100') },
            { $$type: 'TipCreator', creatorAddress: creator.address, videoId: 42n },
        );

        expect(result.transactions).toHaveTransaction({
            from: tipJar.address,
            to: creator.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: tipJar.address,
            to: platformWallet.address,
            success: true,
        });
    });
});

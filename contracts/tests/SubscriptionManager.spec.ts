import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { SubscriptionManager } from '../build/SubscriptionManager/SubscriptionManager_SubscriptionManager';
import '@ton/test-utils';

describe('SubscriptionManager', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let platformWallet: SandboxContract<TreasuryContract>;
    let subscriptionManager: SandboxContract<SubscriptionManager>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        platformWallet = await blockchain.treasury('platform');

        subscriptionManager = blockchain.openContract(
            await SubscriptionManager.fromInit(platformWallet.address, 1000n) // 10% fee
        );

        const deployResult = await subscriptionManager.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: subscriptionManager.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        const isSubscribed = await subscriptionManager.getIsSubscribed(deployer.address, platformWallet.address);
        expect(isSubscribed).toBe(false);
    });

    it('should subscribe successfully', async () => {
        const subscriber = await blockchain.treasury('subscriber');
        const creator = await blockchain.treasury('creator');

        const result = await subscriptionManager.send(
            subscriber.getSender(),
            { value: toNano('2') },
            { $$type: 'Subscribe', creatorAddress: creator.address, tier: 1n },
        );

        expect(result.transactions).toHaveTransaction({
            from: subscriber.address,
            to: subscriptionManager.address,
            success: true,
        });

        // Platform should receive fee
        expect(result.transactions).toHaveTransaction({
            from: subscriptionManager.address,
            to: platformWallet.address,
            success: true,
        });

        const isSubscribed = await subscriptionManager.getIsSubscribed(subscriber.address, creator.address);
        expect(isSubscribed).toBe(true);
    });

    it('should reject subscription with insufficient payment', async () => {
        const subscriber = await blockchain.treasury('subscriber');
        const creator = await blockchain.treasury('creator');

        const result = await subscriptionManager.send(
            subscriber.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Subscribe', creatorAddress: creator.address, tier: 1n },
        );

        expect(result.transactions).toHaveTransaction({
            from: subscriber.address,
            to: subscriptionManager.address,
            success: false,
        });
    });

    it('should return subscription details', async () => {
        const subscriber = await blockchain.treasury('subscriber');
        const creator = await blockchain.treasury('creator');

        await subscriptionManager.send(
            subscriber.getSender(),
            { value: toNano('2') },
            { $$type: 'Subscribe', creatorAddress: creator.address, tier: 2n },
        );

        const sub = await subscriptionManager.getGetSubscription(subscriber.address, creator.address);
        expect(sub).not.toBeNull();
        expect(sub!.tier).toBe(2n);
        expect(sub!.subscriber.equals(subscriber.address)).toBe(true);
    });

    it('should allow creator to withdraw balance', async () => {
        const subscriber = await blockchain.treasury('subscriber');
        const creator = await blockchain.treasury('creator');

        // Subscribe to accumulate balance
        await subscriptionManager.send(
            subscriber.getSender(),
            { value: toNano('5') },
            { $$type: 'Subscribe', creatorAddress: creator.address, tier: 1n },
        );

        const creatorBalanceBefore = await creator.getBalance();

        const result = await subscriptionManager.send(
            creator.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Withdraw' },
        );

        expect(result.transactions).toHaveTransaction({
            from: subscriptionManager.address,
            to: creator.address,
            success: true,
        });

        const creatorBalanceAfter = await creator.getBalance();
        expect(creatorBalanceAfter).toBeGreaterThan(creatorBalanceBefore);
    });

    it('should reject withdraw with no balance', async () => {
        const randomUser = await blockchain.treasury('random');

        const result = await subscriptionManager.send(
            randomUser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Withdraw' },
        );

        expect(result.transactions).toHaveTransaction({
            from: randomUser.address,
            to: subscriptionManager.address,
            success: false,
        });
    });

    it('should return false for non-subscriber', async () => {
        const random = await blockchain.treasury('random');
        const creator = await blockchain.treasury('creator');

        const isSubscribed = await subscriptionManager.getIsSubscribed(random.address, creator.address);
        expect(isSubscribed).toBe(false);
    });
});

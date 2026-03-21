import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { ContentRegistry } from '../build/ContentRegistry/ContentRegistry_ContentRegistry';
import '@ton/test-utils';

describe('ContentRegistry', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let contentRegistry: SandboxContract<ContentRegistry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        contentRegistry = blockchain.openContract(await ContentRegistry.fromInit(deployer.address));

        const deployResult = await contentRegistry.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: contentRegistry.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        const owner = await contentRegistry.getOwner();
        expect(owner.equals(deployer.address)).toBe(true);
    });

    it('should register content', async () => {
        const user = await blockchain.treasury('user1');
        const result = await contentRegistry.send(
            user.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RegisterContent', videoId: 1n, contentHash: 'abc123hash' },
        );

        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: contentRegistry.address,
            success: true,
        });

        const creator = await contentRegistry.getGetCreator('abc123hash');
        expect(creator!.equals(user.address)).toBe(true);
    });

    it('should reject duplicate content hash', async () => {
        const user1 = await blockchain.treasury('user1');
        const user2 = await blockchain.treasury('user2');

        await contentRegistry.send(
            user1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RegisterContent', videoId: 1n, contentHash: 'duplicate_hash' },
        );

        const result = await contentRegistry.send(
            user2.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RegisterContent', videoId: 2n, contentHash: 'duplicate_hash' },
        );

        expect(result.transactions).toHaveTransaction({
            from: user2.address,
            to: contentRegistry.address,
            success: false,
        });
    });

    it('should return null for unregistered content', async () => {
        const creator = await contentRegistry.getGetCreator('nonexistent');
        expect(creator).toBeNull();
    });

    it('should allow different hashes from same user', async () => {
        const user = await blockchain.treasury('user1');

        await contentRegistry.send(
            user.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RegisterContent', videoId: 1n, contentHash: 'hash_one' },
        );

        const result = await contentRegistry.send(
            user.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RegisterContent', videoId: 2n, contentHash: 'hash_two' },
        );

        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: contentRegistry.address,
            success: true,
        });

        const creator1 = await contentRegistry.getGetCreator('hash_one');
        const creator2 = await contentRegistry.getGetCreator('hash_two');
        expect(creator1!.equals(user.address)).toBe(true);
        expect(creator2!.equals(user.address)).toBe(true);
    });
});

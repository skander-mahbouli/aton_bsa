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

        contentRegistry = blockchain.openContract(await ContentRegistry.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await contentRegistry.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: contentRegistry.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and contentRegistry are ready to use
    });
});

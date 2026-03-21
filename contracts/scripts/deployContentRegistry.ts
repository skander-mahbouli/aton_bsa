import { toNano } from '@ton/core';
import { ContentRegistry } from '../build/ContentRegistry/ContentRegistry_ContentRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const owner = provider.sender().address!;

    const contentRegistry = provider.open(
        await ContentRegistry.fromInit(owner)
    );

    await contentRegistry.send(
        provider.sender(),
        { value: toNano('0.05') },
        { $$type: 'Deploy', queryId: 0n }
    );

    await provider.waitForDeploy(contentRegistry.address);

    console.log('ContentRegistry deployed to:', contentRegistry.address.toString());
}

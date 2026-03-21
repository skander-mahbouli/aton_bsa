import { toNano } from '@ton/core';
import { ContentRegistry } from '../build/ContentRegistry/ContentRegistry_ContentRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const contentRegistry = provider.open(await ContentRegistry.fromInit());

    await contentRegistry.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(contentRegistry.address);

    // run methods on `contentRegistry`
}

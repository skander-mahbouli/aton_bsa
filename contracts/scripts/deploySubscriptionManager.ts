import { toNano } from '@ton/core';
import { SubscriptionManager } from '../build/SubscriptionManager/SubscriptionManager_SubscriptionManager';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const platformWallet = provider.sender().address!;
    const platformFeeBps = 1000; // 10%

    const subscriptionManager = provider.open(
        await SubscriptionManager.fromInit(platformWallet, BigInt(platformFeeBps))
    );

    await subscriptionManager.send(
        provider.sender(),
        { value: toNano('0.05') },
        { $$type: 'Deploy', queryId: 0n }
    );

    await provider.waitForDeploy(subscriptionManager.address);

    console.log('SubscriptionManager deployed to:', subscriptionManager.address.toString());
}

import { toNano } from '@ton/core';
import { TipJar } from '../build/TipJar/TipJar_TipJar';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const platformWallet = provider.sender().address!;
    const platformFeeBps = 500; // 5%

    const tipJar = provider.open(
        await TipJar.fromInit(platformWallet, BigInt(platformFeeBps))
    );

    await tipJar.send(
        provider.sender(),
        { value: toNano('0.05') },
        { $$type: 'Deploy', queryId: 0n }
    );

    await provider.waitForDeploy(tipJar.address);

    console.log('TipJar deployed to:', tipJar.address.toString());
}

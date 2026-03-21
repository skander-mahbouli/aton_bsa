import { TonClient, Address } from '@ton/ton';
import { SubscriptionManager } from '../build/SubscriptionManager/SubscriptionManager_SubscriptionManager';

async function verify() {
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TON_API_KEY
    });

    const contract = client.open(
        SubscriptionManager.fromAddress(
            Address.parse('EQB7wAeacEGo5AvIxcILrQBhX_xXznFSuDbJoc3dO7gV9aKR')
        )
    );

    const dummy = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
    const result = await contract.getIsSubscribed(dummy, dummy);
    console.log('isSubscribed(dummy, dummy):', result);
}

verify().catch(console.error);

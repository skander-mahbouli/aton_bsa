import { TonClient } from '@ton/ton';
import { mnemonicToPrivateKey, KeyPair } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

let tonClient: TonClient | null = null;

export function getTonClient(): TonClient {
    if (!tonClient) {
        const network = process.env.TON_NETWORK || 'testnet';
        const endpoint = network === 'testnet'
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC';

        tonClient = new TonClient({
            endpoint,
            apiKey: process.env.TON_API_KEY,
        });
    }
    return tonClient;
}

export async function getPlatformWallet(): Promise<{
    wallet: WalletContractV4;
    keyPair: KeyPair;
    contract: ReturnType<TonClient['open']>;
}> {
    const mnemonic = process.env.PLATFORM_WALLET_MNEMONIC;
    if (!mnemonic) {
        throw new Error('PLATFORM_WALLET_MNEMONIC not set');
    }

    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
    const wallet = WalletContractV4.create({
        publicKey: keyPair.publicKey,
        workchain: 0,
    });

    const client = getTonClient();
    const contract = client.open(wallet);

    return { wallet, keyPair, contract };
}

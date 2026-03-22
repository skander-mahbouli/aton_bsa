import { Address, TupleBuilder } from '@ton/ton';
import { getTonClient } from './client.js';

export async function checkJettonBalance(
    walletAddress: string,
    jettonMinterAddress: string,
): Promise<bigint> {
    try {
        const client = getTonClient();
        const minterAddr = Address.parse(jettonMinterAddress);
        const ownerAddr = Address.parse(walletAddress);

        // Step 1: get_wallet_address on minter
        const args = new TupleBuilder();
        args.writeAddress(ownerAddr);
        const walletResult = await client.runMethod(minterAddr, 'get_wallet_address', args.build());
        const jettonWalletAddr = walletResult.stack.readAddress();

        // Step 2: get_wallet_data on jetton wallet
        const dataResult = await client.runMethod(jettonWalletAddr, 'get_wallet_data');
        const balance = dataResult.stack.readBigNumber();

        return balance;
    } catch {
        // Contract not deployed or other error = 0 balance
        return 0n;
    }
}

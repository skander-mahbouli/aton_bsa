import { Address, toNano, beginCell } from '@ton/ton';
import { getPlatformWallet, getTonClient } from './client.js';
import type Database from 'better-sqlite3';

export async function registerContentOnChain(
    videoId: number,
    contentHash: string,
    db: Database.Database,
): Promise<void> {
    try {
        const registryAddress = process.env.CONTENT_REGISTRY_ADDRESS;
        if (!registryAddress) return;

        const { contract, keyPair } = await getPlatformWallet();

        // Build RegisterContent message body
        // opcode from compiled contract: 0x3e869432
        const body = beginCell()
            .storeUint(0x3e869432, 32)
            .storeUint(videoId, 64)
            .storeRef(beginCell().storeStringTail(contentHash).endCell())
            .endCell();

        const seqno = await (contract as unknown as { getSeqno: () => Promise<number> }).getSeqno();

        await (contract as unknown as {
            sendTransfer: (args: {
                seqno: number;
                secretKey: Buffer;
                messages: unknown[];
            }) => Promise<void>;
        }).sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            messages: [
                {
                    to: Address.parse(registryAddress),
                    value: toNano('0.05'),
                    body,
                },
            ],
        });

        // Wait a bit for the transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Try to get the transaction hash (simplified — just mark as registered)
        db.prepare('UPDATE videos SET content_hash = ?, registration_tx = ? WHERE id = ?')
            .run(contentHash, `registered:${Date.now()}`, videoId);
    } catch (err) {
        console.error('Failed to register content on-chain:', err);
    }
}

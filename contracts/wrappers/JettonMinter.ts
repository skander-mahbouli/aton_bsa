import { Address, beginCell, Cell } from '@ton/core';
import { JettonMinter as JettonMinterContract } from '../build/JettonMinter/JettonMinter_JettonMinter';

export { JettonMinterContract };

/**
 * Builds a TEP-64 off-chain metadata cell pointing to a JSON URL.
 * The URL should resolve to a JSON object with at minimum: name, symbol, image.
 */
export function buildMetadataCell(name: string, symbol: string, imageUrl: string): Cell {
    // On-chain snake encoding for simple metadata
    const nameCell = beginCell().storeUint(0, 8).storeStringTail(name).endCell();
    const symbolCell = beginCell().storeUint(0, 8).storeStringTail(symbol).endCell();
    const imageCell = beginCell().storeUint(0, 8).storeStringTail(imageUrl).endCell();

    // Build content dict: sha256(key) -> snake-encoded value
    const nameKey = BigInt('0x' + Buffer.from('name').toString('hex').padStart(64, '0'));
    const symbolKey = BigInt('0x' + Buffer.from('symbol').toString('hex').padStart(64, '0'));
    const imageKey = BigInt('0x' + Buffer.from('image').toString('hex').padStart(64, '0'));

    // Use on-chain format (0x00 prefix byte) with dict
    return beginCell()
        .storeUint(0x00, 8)
        .storeDict(
            (() => {
                const { Dictionary } = require('@ton/core');
                const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
                dict.set(nameKey, nameCell);
                dict.set(symbolKey, symbolCell);
                dict.set(imageKey, imageCell);
                return dict;
            })()
        )
        .endCell();
}

/**
 * Creates a JettonMinter instance from owner address and content cell.
 * Use this to compute the contract address before deploying via TonConnect.
 */
export async function createJettonMinter(owner: Address, content: Cell) {
    return JettonMinterContract.fromInit(owner, content);
}

import { Address, beginCell, Cell, toNano } from '@ton/core';
import { NftCollection as NftCollectionContract } from '../build/NftCollection/NftCollection_NftCollection';

export { NftCollectionContract };

/**
 * Builds an off-chain metadata cell for an NFT collection.
 * The imageUrl should point to the collection cover image.
 */
export function buildNftCollectionContent(name: string, description: string, imageUrl: string): Cell {
    return beginCell()
        .storeUint(0x01, 8) // off-chain indicator
        .storeStringTail(
            JSON.stringify({ name, description, image: imageUrl })
        )
        .endCell();
}

/**
 * Creates an NftCollection instance from its parameters.
 * Use this to compute the contract address before deploying via TonConnect.
 */
export async function createNftCollection(
    owner: Address,
    content: Cell,
    mintPriceTon: string,
    maxSupply: number
) {
    return NftCollectionContract.fromInit(owner, content, toNano(mintPriceTon), BigInt(maxSupply));
}

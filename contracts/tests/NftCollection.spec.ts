import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano } from '@ton/core';
import { NftCollection } from '../build/NftCollection/NftCollection_NftCollection';
import { NftItem } from '../build/NftCollection/NftCollection_NftItem';
import '@ton/test-utils';

describe('NftCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;

    const collectionContent = beginCell()
        .storeUint(0x01, 8)
        .storeStringTail(JSON.stringify({ name: 'Test NFTs', description: 'Test', image: 'https://example.com/img.png' }))
        .endCell();

    const mintPrice = toNano('0.5');
    const maxSupply = 10n;

    async function fundContract(address: ReturnType<typeof nftCollection.address extends infer T ? () => T : never> extends () => infer R ? R : never) {
        // The Deployable trait returns all excess TON on deploy (mode 66).
        // NftCollection uses SendPayGasSeparately (mode 1) for the NFT item deploy,
        // which requires the contract to have its own balance beyond the inbound value.
        // Top up the contract by setting its balance directly in the sandbox.
        const contract = await blockchain.getContract(nftCollection.address);
        contract.balance = toNano('1');
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        nftCollection = blockchain.openContract(
            await NftCollection.fromInit(deployer.address, collectionContent, mintPrice, maxSupply)
        );

        const deployResult = await nftCollection.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });

        // Fund the contract so it can pay for NFT item deploys with SendPayGasSeparately
        const contract = await blockchain.getContract(nftCollection.address);
        contract.balance = toNano('1');
    });

    it('should deploy with correct data', async () => {
        const data = await nftCollection.getGetCollectionData();
        expect(data.nextItemIndex).toBe(0n);
        expect(data.owner.equals(deployer.address)).toBe(true);

        const price = await nftCollection.getGetMintPrice();
        expect(price).toBe(mintPrice);

        const supply = await nftCollection.getGetMaxSupply();
        expect(supply).toBe(maxSupply);
    });

    it('should mint an NFT', async () => {
        const minter = await blockchain.treasury('minter');

        const result = await nftCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 0n },
        );

        expect(result.transactions).toHaveTransaction({
            from: minter.address,
            to: nftCollection.address,
            success: true,
        });

        const data = await nftCollection.getGetCollectionData();
        expect(data.nextItemIndex).toBe(1n);

        // Verify NFT item was deployed
        const nftAddress = await nftCollection.getGetNftAddressByIndex(0n);
        expect(result.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftAddress,
            deploy: true,
            success: true,
        });
    });

    it('should reject mint with insufficient payment', async () => {
        const minter = await blockchain.treasury('minter');

        const result = await nftCollection.send(
            minter.getSender(),
            { value: toNano('0.1') },
            { $$type: 'NftMint', queryId: 0n },
        );

        expect(result.transactions).toHaveTransaction({
            from: minter.address,
            to: nftCollection.address,
            success: false,
        });
    });

    it('should mint multiple NFTs with incrementing index', async () => {
        const minter = await blockchain.treasury('minter');

        await nftCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 0n },
        );

        await nftCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 1n },
        );

        await nftCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 2n },
        );

        const data = await nftCollection.getGetCollectionData();
        expect(data.nextItemIndex).toBe(3n);

        // Each NFT should have a different address
        const addr0 = await nftCollection.getGetNftAddressByIndex(0n);
        const addr1 = await nftCollection.getGetNftAddressByIndex(1n);
        const addr2 = await nftCollection.getGetNftAddressByIndex(2n);
        expect(addr0.equals(addr1)).toBe(false);
        expect(addr1.equals(addr2)).toBe(false);
    });

    it('should enforce max supply', async () => {
        // Deploy a collection with maxSupply=2
        const smallCollection = blockchain.openContract(
            await NftCollection.fromInit(deployer.address, collectionContent, mintPrice, 2n)
        );

        await smallCollection.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n },
        );

        // Fund the small collection
        const contract = await blockchain.getContract(smallCollection.address);
        contract.balance = toNano('1');

        const minter = await blockchain.treasury('minter');

        // Mint #1
        await smallCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 0n },
        );

        // Mint #2
        await smallCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 1n },
        );

        // Mint #3 should fail — sold out
        const result = await smallCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 2n },
        );

        expect(result.transactions).toHaveTransaction({
            from: minter.address,
            to: smallCollection.address,
            success: false,
        });
    });

    it('should verify minted NFT item data', async () => {
        const minter = await blockchain.treasury('minter');

        await nftCollection.send(
            minter.getSender(),
            { value: toNano('1') },
            { $$type: 'NftMint', queryId: 0n },
        );

        const nftAddress = await nftCollection.getGetNftAddressByIndex(0n);
        const nftItem = blockchain.openContract(NftItem.fromAddress(nftAddress));
        const nftData = await nftItem.getGetNftData();

        expect(nftData.isInitialized).toBe(true);
        expect(nftData.index).toBe(0n);
        expect(nftData.collection.equals(nftCollection.address)).toBe(true);
    });
});

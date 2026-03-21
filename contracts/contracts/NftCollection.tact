import "@stdlib/deploy";
import "./NftItem.tact";

message(0x00000002) NftMint {
    queryId: Int as uint64;
}

struct CollectionData {
    nextItemIndex: Int;
    content: Cell;
    owner: Address;
}

// TEP-62 NFT Collection — deployed by each creator for their NFT drop
contract NftCollection with Deployable {
    owner: Address;
    nextItemIndex: Int as uint64;
    collectionContent: Cell;
    mintPrice: Int as coins;
    maxSupply: Int as uint64;

    init(owner: Address, collectionContent: Cell, mintPrice: Int, maxSupply: Int) {
        self.owner = owner;
        self.nextItemIndex = 0;
        self.collectionContent = collectionContent;
        self.mintPrice = mintPrice;
        self.maxSupply = maxSupply;
    }

    receive(msg: NftMint) {
        require(context().value >= self.mintPrice, "Insufficient payment");
        require(self.nextItemIndex < self.maxSupply, "Sold out");

        let nftInit: StateInit = initOf NftItem(myAddress(), self.nextItemIndex);
        let nftAddress: Address = contractAddress(nftInit);

        send(SendParameters{
            to: nftAddress,
            value: ton("0.02"),
            bounce: false,
            mode: SendPayGasSeparately,
            body: "init".asComment(),
            code: nftInit.code,
            data: nftInit.data
        });

        // Send excess back to minter
        send(SendParameters{
            to: sender(),
            value: 0,
            bounce: false,
            mode: SendRemainingValue
        });

        self.nextItemIndex += 1;
    }

    get fun get_collection_data(): CollectionData {
        return CollectionData{
            nextItemIndex: self.nextItemIndex,
            content: self.collectionContent,
            owner: self.owner
        };
    }

    get fun get_nft_address_by_index(index: Int): Address {
        return contractAddress(initOf NftItem(myAddress(), index));
    }

    get fun get_mint_price(): Int {
        return self.mintPrice;
    }

    get fun get_max_supply(): Int {
        return self.maxSupply;
    }
}

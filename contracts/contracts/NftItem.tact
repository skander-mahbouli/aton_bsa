struct NftData {
    isInitialized: Bool;
    index: Int;
    collection: Address;
    owner: Address;
    content: Cell;
}

// TEP-62 NFT Item — represents a single NFT owned by a user
contract NftItem {
    isInitialized: Bool;
    index: Int as uint64;
    collection: Address;
    owner: Address;
    content: Cell;

    init(collection: Address, index: Int) {
        self.isInitialized = false;
        self.index = index;
        self.collection = collection;
        self.owner = collection; // temporary until initialized
        self.content = emptyCell();
    }

    // Called by collection on mint
    receive("init") {
        require(sender() == self.collection, "Not collection");
        require(!self.isInitialized, "Already initialized");
        self.isInitialized = true;
    }

    // Transfer ownership
    receive("transfer") {
        require(sender() == self.owner, "Not owner");
    }

    get fun get_nft_data(): NftData {
        return NftData{
            isInitialized: self.isInitialized,
            index: self.index,
            collection: self.collection,
            owner: self.owner,
            content: self.content
        };
    }
}

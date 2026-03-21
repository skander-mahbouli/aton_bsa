import "@stdlib/deploy";

message RegisterContent {
    videoId: Int as uint64;
    contentHash: String;
}

message RegisterContentEvent {
    videoId: Int as uint64;
    contentHash: String;
    creator: Address;
}

// Stores a SHA-256 hash of each video with the creator's address.
// Enforces uniqueness — same content hash cannot be registered twice.
contract ContentRegistry with Deployable {
    owner: Address;
    registrations: map<Int, Address>;

    init(owner: Address) {
        self.owner = owner;
    }

    receive(msg: RegisterContent) {
        let key: Int = sha256(msg.contentHash);
        require(self.registrations.get(key) == null, "Content already registered");
        self.registrations.set(key, sender());
        emit(RegisterContentEvent{
            videoId: msg.videoId,
            contentHash: msg.contentHash,
            creator: sender()
        }.toCell());
    }

    get fun getCreator(contentHash: String): Address? {
        return self.registrations.get(sha256(contentHash));
    }

    get fun owner(): Address {
        return self.owner;
    }
}

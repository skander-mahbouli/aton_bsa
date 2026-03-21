import "@stdlib/deploy";

message TipCreator {
    creatorAddress: Address;
    videoId: Int as uint64;
}

// Receives TON tips and splits them: 95% to creator, 5% to platform.
contract TipJar with Deployable {
    platformWallet: Address;
    platformFeeBps: Int as uint16;

    init(platformWallet: Address, platformFeeBps: Int) {
        self.platformWallet = platformWallet;
        self.platformFeeBps = platformFeeBps;
    }

    receive(msg: TipCreator) {
        let amount: Int = context().value;
        require(amount > ton("0.05"), "Tip too small");

        let platformFee: Int = amount * self.platformFeeBps / 10000;
        let creatorAmount: Int = amount - platformFee - ton("0.02");

        send(SendParameters{
            to: msg.creatorAddress,
            value: creatorAmount,
            mode: SendPayGasSeparately,
            bounce: false
        });

        send(SendParameters{
            to: self.platformWallet,
            value: platformFee,
            mode: SendPayGasSeparately,
            bounce: false
        });
    }

    get fun platformWallet(): Address {
        return self.platformWallet;
    }

    get fun platformFeeBps(): Int {
        return self.platformFeeBps;
    }
}

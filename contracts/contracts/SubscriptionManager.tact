import "@stdlib/deploy";

struct SubscriptionRecord {
    subscriber: Address;
    tier: Int as uint8;
    expiresAt: Int as uint64;
}

message Subscribe {
    creatorAddress: Address;
    tier: Int as uint8;
}

message Withdraw {}

// Handles monthly subscriptions: fan pays TON, creator balance accumulates,
// creator withdraws anytime. Platform takes 10%.
contract SubscriptionManager with Deployable {
    platformWallet: Address;
    platformFeeBps: Int as uint16;
    subscriptions: map<Int, SubscriptionRecord>;
    creatorBalances: map<Address, Int>;

    init(platformWallet: Address, platformFeeBps: Int) {
        self.platformWallet = platformWallet;
        self.platformFeeBps = platformFeeBps;
    }

    receive(msg: Subscribe) {
        let amount: Int = context().value;
        require(amount > ton("0.1"), "Payment too small");

        let platformFee: Int = amount * self.platformFeeBps / 10000;
        let creatorAmount: Int = amount - platformFee - ton("0.02");

        // Key is a hash of subscriber address + creator address
        let key: Int = beginCell()
            .storeAddress(sender())
            .storeAddress(msg.creatorAddress)
            .endCell()
            .hash();

        self.subscriptions.set(key, SubscriptionRecord{
            subscriber: sender(),
            tier: msg.tier,
            expiresAt: now() + 2592000
        });

        // Accumulate creator balance
        let maybeBalance: Int? = self.creatorBalances.get(msg.creatorAddress);
        let currentBalance: Int = maybeBalance != null ? maybeBalance!! : 0;
        self.creatorBalances.set(msg.creatorAddress, currentBalance + creatorAmount);

        // Send platform fee immediately
        send(SendParameters{
            to: self.platformWallet,
            value: platformFee,
            mode: SendPayGasSeparately,
            bounce: false
        });
    }

    receive(msg: Withdraw) {
        let maybeBalance: Int? = self.creatorBalances.get(sender());
        let balance: Int = maybeBalance != null ? maybeBalance!! : 0;
        require(balance > ton("0.05"), "Insufficient balance");

        self.creatorBalances.set(sender(), 0);

        send(SendParameters{
            to: sender(),
            value: balance,
            mode: SendPayGasSeparately,
            bounce: false
        });
    }

    get fun isSubscribed(subscriber: Address, creator: Address): Bool {
        let key: Int = beginCell()
            .storeAddress(subscriber)
            .storeAddress(creator)
            .endCell()
            .hash();
        let record: SubscriptionRecord? = self.subscriptions.get(key);
        if (record == null) {
            return false;
        }
        return (record!!).expiresAt > now();
    }

    get fun getSubscription(subscriber: Address, creator: Address): SubscriptionRecord? {
        let key: Int = beginCell()
            .storeAddress(subscriber)
            .storeAddress(creator)
            .endCell()
            .hash();
        return self.subscriptions.get(key);
    }

    get fun creatorBalance(creator: Address): Int {
        let maybeBalance: Int? = self.creatorBalances.get(creator);
        return maybeBalance != null ? maybeBalance!! : 0;
    }
}

import "@stdlib/deploy";

// TEP-74 messages
message(0xf8a7ea5) JettonTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x178d4519) JettonInternalTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    responseAddress: Address?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x7362d09c) JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

message(0xd53276db) JettonExcesses {
    queryId: Int as uint64;
}

message(0x595f07bc) JettonBurn {
    queryId: Int as uint64;
    amount: Int as coins;
    responseDestination: Address?;
    customPayload: Cell?;
}

message(0x7bdd97de) JettonBurnNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    responseDestination: Address?;
}

struct JettonWalletData {
    balance: Int;
    owner: Address;
    master: Address;
    walletCode: Cell;
}

// TEP-74 Jetton Wallet — holds a user's token balance
contract JettonWallet {
    balance: Int as coins;
    owner: Address;
    master: Address;

    init(owner: Address, master: Address) {
        self.balance = 0;
        self.owner = owner;
        self.master = master;
    }

    // Receives tokens from master (mint) or another wallet (transfer)
    receive(msg: JettonInternalTransfer) {
        let expectedSender: Address = contractAddress(initOf JettonWallet(msg.from, self.master));
        require(sender() == self.master || sender() == expectedSender, "Not authorized");

        self.balance += msg.amount;

        if (msg.forwardTonAmount > 0) {
            send(SendParameters{
                to: self.owner,
                value: msg.forwardTonAmount,
                bounce: false,
                body: JettonTransferNotification{
                    queryId: msg.queryId,
                    amount: msg.amount,
                    sender: msg.from,
                    forwardPayload: msg.forwardPayload
                }.toCell()
            });
        }

        if (msg.responseAddress != null) {
            send(SendParameters{
                to: msg.responseAddress!!,
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: JettonExcesses{ queryId: msg.queryId }.toCell()
            });
        }
    }

    // Transfers tokens to another user
    receive(msg: JettonTransfer) {
        require(sender() == self.owner, "Not owner");
        require(self.balance >= msg.amount, "Insufficient balance");

        self.balance -= msg.amount;

        let walletInit: StateInit = initOf JettonWallet(msg.destination, self.master);

        send(SendParameters{
            to: contractAddress(walletInit),
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: JettonInternalTransfer{
                queryId: msg.queryId,
                amount: msg.amount,
                from: self.owner,
                responseAddress: msg.responseDestination,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: msg.forwardPayload
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data
        });
    }

    // Burns tokens — notifies master to reduce totalSupply
    receive(msg: JettonBurn) {
        require(sender() == self.owner, "Not owner");
        require(self.balance >= msg.amount, "Insufficient balance");

        self.balance -= msg.amount;

        send(SendParameters{
            to: self.master,
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: JettonBurnNotification{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseDestination: msg.responseDestination
            }.toCell()
        });
    }

    get fun get_wallet_data(): JettonWalletData {
        return JettonWalletData{
            balance: self.balance,
            owner: self.owner,
            master: self.master,
            walletCode: (initOf JettonWallet(self.owner, self.master)).code
        };
    }
}

import "@stdlib/deploy";
import "./JettonWallet.tact";

message(0x00000001) JettonMint {
    queryId: Int as uint64;
    receiver: Address;
    amount: Int as coins;
    forwardTonAmount: Int as coins;
}

struct JettonData {
    totalSupply: Int;
    mintable: Bool;
    owner: Address;
    content: Cell;
    walletCode: Cell;
}

// TEP-74 Jetton Minter — deployed by each creator for their own token
contract JettonMinter with Deployable {
    totalSupply: Int as coins;
    owner: Address;
    content: Cell;

    init(owner: Address, content: Cell) {
        self.totalSupply = 0;
        self.owner = owner;
        self.content = content;
    }

    // Mint new tokens to a receiver address (owner only)
    receive(msg: JettonMint) {
        require(sender() == self.owner, "Not owner");

        self.totalSupply += msg.amount;

        let walletInit: StateInit = initOf JettonWallet(msg.receiver, myAddress());

        send(SendParameters{
            to: contractAddress(walletInit),
            value: msg.forwardTonAmount + ton("0.02"),
            bounce: true,
            mode: SendPayGasSeparately,
            body: JettonInternalTransfer{
                queryId: msg.queryId,
                amount: msg.amount,
                from: myAddress(),
                responseAddress: self.owner,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: emptySlice()
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data
        });
    }

    // Reduce totalSupply when tokens are burned
    receive(msg: JettonBurnNotification) {
        let expectedWallet: Address = contractAddress(initOf JettonWallet(msg.sender, myAddress()));
        require(sender() == expectedWallet, "Not authorized");

        self.totalSupply -= msg.amount;

        if (msg.responseDestination != null) {
            send(SendParameters{
                to: msg.responseDestination!!,
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: JettonExcesses{ queryId: msg.queryId }.toCell()
            });
        }
    }

    get fun get_jetton_data(): JettonData {
        return JettonData{
            totalSupply: self.totalSupply,
            mintable: true,
            owner: self.owner,
            content: self.content,
            walletCode: (initOf JettonWallet(myAddress(), myAddress())).code
        };
    }

    get fun get_wallet_address(owner: Address): Address {
        return contractAddress(initOf JettonWallet(owner, myAddress()));
    }
}

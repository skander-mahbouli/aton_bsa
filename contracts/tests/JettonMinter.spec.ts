import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano } from '@ton/core';
import { JettonMinter } from '../build/JettonMinter/JettonMinter_JettonMinter';
import { JettonWallet } from '../build/JettonMinter/JettonMinter_JettonWallet';
import '@ton/test-utils';

describe('JettonMinter', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jettonMinter: SandboxContract<JettonMinter>;

    const content = beginCell().storeUint(0, 8).storeStringTail('Test Token').endCell();

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        jettonMinter = blockchain.openContract(
            await JettonMinter.fromInit(deployer.address, content)
        );

        const deployResult = await jettonMinter.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMinter.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy with zero supply', async () => {
        const data = await jettonMinter.getGetJettonData();
        expect(data.totalSupply).toBe(0n);
        expect(data.mintable).toBe(true);
        expect(data.owner.equals(deployer.address)).toBe(true);
    });

    it('should mint tokens to a receiver', async () => {
        const receiver = await blockchain.treasury('receiver');

        const result = await jettonMinter.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonMint',
                queryId: 0n,
                receiver: receiver.address,
                amount: toNano('1000'),
                forwardTonAmount: 0n,
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMinter.address,
            success: true,
        });

        const data = await jettonMinter.getGetJettonData();
        expect(data.totalSupply).toBe(toNano('1000'));
    });

    it('should reject mint from non-owner', async () => {
        const attacker = await blockchain.treasury('attacker');

        const result = await jettonMinter.send(
            attacker.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonMint',
                queryId: 0n,
                receiver: attacker.address,
                amount: toNano('1000'),
                forwardTonAmount: 0n,
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: attacker.address,
            to: jettonMinter.address,
            success: false,
        });
    });

    it('should compute wallet address', async () => {
        const receiver = await blockchain.treasury('receiver');
        const walletAddress = await jettonMinter.getGetWalletAddress(receiver.address);
        expect(walletAddress).toBeDefined();

        // Wallet address should be deterministic
        const walletAddress2 = await jettonMinter.getGetWalletAddress(receiver.address);
        expect(walletAddress.equals(walletAddress2)).toBe(true);
    });

    it('should allow token transfer between wallets', async () => {
        const sender = await blockchain.treasury('sender');
        const receiver = await blockchain.treasury('receiver');

        // Mint to sender
        await jettonMinter.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonMint',
                queryId: 0n,
                receiver: sender.address,
                amount: toNano('1000'),
                forwardTonAmount: 0n,
            },
        );

        // Get sender's jetton wallet
        const senderWalletAddress = await jettonMinter.getGetWalletAddress(sender.address);
        const senderWallet = blockchain.openContract(JettonWallet.fromAddress(senderWalletAddress));

        // Transfer from sender to receiver
        const result = await senderWallet.send(
            sender.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonTransfer',
                queryId: 0n,
                amount: toNano('300'),
                destination: receiver.address,
                responseDestination: sender.address,
                customPayload: null,
                forwardTonAmount: 0n,
                forwardPayload: beginCell().endCell().asSlice(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: senderWalletAddress,
            success: true,
        });

        // Verify sender balance
        const senderData = await senderWallet.getGetWalletData();
        expect(senderData.balance).toBe(toNano('700'));

        // Verify receiver balance
        const receiverWalletAddress = await jettonMinter.getGetWalletAddress(receiver.address);
        const receiverWallet = blockchain.openContract(JettonWallet.fromAddress(receiverWalletAddress));
        const receiverData = await receiverWallet.getGetWalletData();
        expect(receiverData.balance).toBe(toNano('300'));
    });

    it('should reject transfer with insufficient balance', async () => {
        const sender = await blockchain.treasury('sender');
        const receiver = await blockchain.treasury('receiver');

        // Mint small amount
        await jettonMinter.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonMint',
                queryId: 0n,
                receiver: sender.address,
                amount: toNano('100'),
                forwardTonAmount: 0n,
            },
        );

        const senderWalletAddress = await jettonMinter.getGetWalletAddress(sender.address);
        const senderWallet = blockchain.openContract(JettonWallet.fromAddress(senderWalletAddress));

        // Try to transfer more than balance
        const result = await senderWallet.send(
            sender.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonTransfer',
                queryId: 0n,
                amount: toNano('200'),
                destination: receiver.address,
                responseDestination: sender.address,
                customPayload: null,
                forwardTonAmount: 0n,
                forwardPayload: beginCell().endCell().asSlice(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            on: senderWalletAddress,
            success: false,
        });
    });

    it('should burn tokens and reduce total supply', async () => {
        const user = await blockchain.treasury('user');

        // Mint tokens
        await jettonMinter.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonMint',
                queryId: 0n,
                receiver: user.address,
                amount: toNano('500'),
                forwardTonAmount: 0n,
            },
        );

        const userWalletAddress = await jettonMinter.getGetWalletAddress(user.address);
        const userWallet = blockchain.openContract(JettonWallet.fromAddress(userWalletAddress));

        // Burn tokens
        const result = await userWallet.send(
            user.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonBurn',
                queryId: 0n,
                amount: toNano('200'),
                responseDestination: user.address,
                customPayload: null,
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: userWalletAddress,
            to: jettonMinter.address,
            success: true,
        });

        // Verify reduced balance
        const userData = await userWallet.getGetWalletData();
        expect(userData.balance).toBe(toNano('300'));

        // Verify reduced total supply
        const data = await jettonMinter.getGetJettonData();
        expect(data.totalSupply).toBe(toNano('300'));
    });
});

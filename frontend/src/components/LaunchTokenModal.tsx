import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address, beginCell, toNano, Dictionary, contractAddress, Cell } from '@ton/ton';
import { JettonMinter } from '../contracts/JettonMinter_JettonMinter';
import api from '../lib/api';

interface Props {
    onClose: () => void;
    onSuccess: (jettonAddress: string, name: string, symbol: string) => void;
}

function buildMetadataCell(name: string, symbol: string, imageUrl: string): Cell {
    const nameCell = beginCell().storeUint(0, 8).storeStringTail(name).endCell();
    const symbolCell = beginCell().storeUint(0, 8).storeStringTail(symbol).endCell();
    const imageCell = beginCell().storeUint(0, 8).storeStringTail(imageUrl).endCell();

    // sha256 of key strings as BigInt
    const encoder = new TextEncoder();
    const nameKey = BigInt('0x' + Array.from(encoder.encode('name')).map(b => b.toString(16).padStart(2, '0')).join('').padStart(64, '0'));
    const symbolKey = BigInt('0x' + Array.from(encoder.encode('symbol')).map(b => b.toString(16).padStart(2, '0')).join('').padStart(64, '0'));
    const imageKey = BigInt('0x' + Array.from(encoder.encode('image')).map(b => b.toString(16).padStart(2, '0')).join('').padStart(64, '0'));

    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    dict.set(nameKey, nameCell);
    dict.set(symbolKey, symbolCell);
    dict.set(imageKey, imageCell);

    return beginCell()
        .storeUint(0x00, 8)
        .storeDict(dict)
        .endCell();
}

export default function LaunchTokenModal({ onClose, onSuccess }: Props) {
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [deploying, setDeploying] = useState(false);
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const handleDeploy = async () => {
        if (!wallet || !name || !symbol) return;
        setDeploying(true);

        try {
            const ownerAddress = Address.parse(wallet.account.address);
            const content = buildMetadataCell(name, symbol.toUpperCase(), imageUrl || '');

            // Compute the minter contract address
            const minter = await JettonMinter.fromInit(ownerAddress, content);

            // Build the StateInit for deployment
            const stateInit = minter.init!;
            const stateInitCell = beginCell()
                .storeBit(false) // split_depth
                .storeBit(false) // special
                .storeBit(true)  // code present
                .storeRef(stateInit.code)
                .storeBit(true)  // data present
                .storeRef(stateInit.data)
                .storeBit(false) // library
                .endCell();

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: minter.address.toRawString(),
                    amount: toNano('0.1').toString(),
                    stateInit: stateInitCell.toBoc().toString('base64'),
                }],
            });

            const jettonAddr = minter.address.toString();

            // Save to profile
            await api.patch('/api/users/me', {
                jettonAddress: jettonAddr,
                jettonName: name,
                jettonSymbol: symbol.toUpperCase(),
            });

            onSuccess(jettonAddr, name, symbol.toUpperCase());
        } catch {
            // user rejected or error
        } finally {
            setDeploying(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            <motion.div
                className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl"
                style={{ backgroundColor: 'var(--tg-bg)' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-hint)' }} />
                </div>

                <div className="px-4 pb-2">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--tg-text)' }}>Launch Your Token</h3>
                </div>

                <div className="px-4 pb-6 flex flex-col gap-3">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Token Name"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />
                    <input
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 8))}
                        placeholder="Symbol (e.g. TIKN)"
                        maxLength={8}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />
                    <input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Token icon URL (optional)"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />

                    {!wallet && (
                        <p className="text-xs text-center" style={{ color: 'var(--tg-hint)' }}>
                            Connect your wallet first to deploy a token
                        </p>
                    )}

                    <button
                        onClick={handleDeploy}
                        disabled={deploying || !wallet || !name || !symbol}
                        className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                        {deploying ? 'Deploying...' : 'Deploy Token'}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

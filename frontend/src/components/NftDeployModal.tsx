import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address, beginCell, toNano } from '@ton/ton';
import { NftCollection } from '../contracts/NftCollection_NftCollection';
import api from '../lib/api';

interface Props {
    onClose: () => void;
}

export default function NftDeployModal({ onClose }: Props) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [maxSupply, setMaxSupply] = useState('100');
    const [mintPrice, setMintPrice] = useState('0.5');
    const [deploying, setDeploying] = useState(false);
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const handleDeploy = async () => {
        if (!wallet || !name) return;
        setDeploying(true);

        try {
            const ownerAddress = Address.parse(wallet.account.address);

            const content = beginCell()
                .storeUint(0x01, 8)
                .storeStringTail(JSON.stringify({ name, description, image: imageUrl }))
                .endCell();

            const collection = await NftCollection.fromInit(
                ownerAddress,
                content,
                toNano(mintPrice),
                BigInt(maxSupply),
            );

            const stateInit = collection.init!;
            const stateInitCell = beginCell()
                .storeBit(false)
                .storeBit(false)
                .storeBit(true)
                .storeRef(stateInit.code)
                .storeBit(true)
                .storeRef(stateInit.data)
                .storeBit(false)
                .endCell();

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: collection.address.toRawString(),
                    amount: toNano('0.1').toString(),
                    stateInit: stateInitCell.toBoc().toString('base64'),
                }],
            });

            // Record in DB
            await api.post('/api/nft-collections', {
                name,
                imageUrl,
                contractAddress: collection.address.toString(),
                maxSupply: parseInt(maxSupply),
                mintPriceTon: mintPrice,
            });

            onClose();
        } catch {
            // user rejected
        } finally {
            setDeploying(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} />

            <motion.div className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl"
                style={{ backgroundColor: 'var(--tg-bg)' }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}>

                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-hint)' }} />
                </div>

                <div className="px-4 pb-2">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--tg-text)' }}>Deploy NFT Collection</h3>
                </div>

                <div className="px-4 pb-6 flex flex-col gap-3">
                    <input value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Collection Name"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }} />
                    <input value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }} />
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Cover image URL"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }} />
                    <div className="flex gap-2">
                        <input value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)}
                            placeholder="Max supply" type="number"
                            className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                            style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }} />
                        <input value={mintPrice} onChange={(e) => setMintPrice(e.target.value)}
                            placeholder="Mint price (TON)" type="number" step="0.1"
                            className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                            style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }} />
                    </div>

                    {!wallet && (
                        <p className="text-xs text-center" style={{ color: 'var(--tg-hint)' }}>
                            Connect your wallet first
                        </p>
                    )}

                    <button onClick={handleDeploy}
                        disabled={deploying || !wallet || !name}
                        className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                        {deploying ? 'Deploying...' : 'Deploy Collection'}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

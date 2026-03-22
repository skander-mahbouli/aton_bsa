import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, toNano, Address } from '@ton/ton';
import api from '../lib/api';
import type { Video } from '../types';

interface Props {
    video: Video;
    onClose: () => void;
}

const STAR_PRESETS = [1, 5, 10, 50, 100];
const TON_PRESETS = ['0.1', '0.5', '1', '5', '10'];

export default function TipModal({ video, onClose }: Props) {
    const [tab, setTab] = useState<'stars' | 'ton'>('stars');
    const [customAmount, setCustomAmount] = useState('');
    const [success, setSuccess] = useState('');
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const handleStarsTip = async (amount: number) => {
        try {
            const res = await api.post<{ invoiceUrl: string }>('/api/payments/stars/invoice', {
                type: 'tip',
                videoId: video.id,
                creatorId: video.creator_id,
                amount,
            });

            const WebApp = (await import('@twa-dev/sdk')).default;
            WebApp.openInvoice(res.data.invoiceUrl, (status: string) => {
                if (status === 'paid') {
                    setSuccess(`+${amount} Stars`);
                    setTimeout(() => { setSuccess(''); onClose(); }, 1500);
                }
            });
        } catch {
            // ignore
        }
    };

    const handleTonTip = async (amount: string) => {
        if (!wallet || !video.creator_wallet) return;

        const tipJarAddress = import.meta.env.VITE_TIP_JAR_ADDRESS;
        if (!tipJarAddress) return;

        try {
            // Build TipCreator message: opcode 0x156419be + creatorAddress + videoId
            const body = beginCell()
                .storeUint(0x156419be, 32)
                .storeAddress(Address.parse(video.creator_wallet))
                .storeUint(video.id, 64)
                .endCell();

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: tipJarAddress,
                    amount: toNano(amount).toString(),
                    payload: body.toBoc().toString('base64'),
                }],
            });

            setSuccess(`+${amount} TON`);
            setTimeout(() => { setSuccess(''); onClose(); }, 1500);
        } catch {
            // user rejected or error
        }
    };

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
                className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl"
                style={{ backgroundColor: 'var(--tg-bg)' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-hint)' }} />
                </div>

                {/* Success animation */}
                {success && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center z-60 pointer-events-none"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: -30 }}
                        exit={{ opacity: 0 }}
                    >
                        <span className="text-2xl font-bold" style={{ color: 'var(--tg-button)' }}>
                            {success}
                        </span>
                    </motion.div>
                )}

                {/* Tabs */}
                <div className="flex justify-center gap-6 px-4 pb-3">
                    <button
                        onClick={() => setTab('stars')}
                        className={`text-sm font-semibold bg-transparent border-none cursor-pointer pb-1 ${tab === 'stars' ? '' : 'opacity-50'}`}
                        style={{ color: 'var(--tg-text)', borderBottom: tab === 'stars' ? '2px solid var(--tg-button)' : '2px solid transparent' }}>
                        Stars
                    </button>
                    <button
                        onClick={() => setTab('ton')}
                        className={`text-sm font-semibold bg-transparent border-none cursor-pointer pb-1 ${tab === 'ton' ? '' : 'opacity-50'}`}
                        style={{ color: 'var(--tg-text)', borderBottom: tab === 'ton' ? '2px solid var(--tg-button)' : '2px solid transparent' }}>
                        TON
                    </button>
                </div>

                {/* Stars tab */}
                {tab === 'stars' && (
                    <div className="px-4 pb-6">
                        <p className="text-xs mb-3" style={{ color: 'var(--tg-hint)' }}>
                            Send Stars to {video.creator_name}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {STAR_PRESETS.map((amount) => (
                                <button key={amount}
                                    onClick={() => handleStarsTip(amount)}
                                    className="px-4 py-2 rounded-full text-sm font-medium"
                                    style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}>
                                    {amount}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                placeholder="Custom"
                                className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                                style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                            />
                            <button
                                onClick={() => { const n = parseInt(customAmount); if (n > 0) handleStarsTip(n); }}
                                disabled={!customAmount || parseInt(customAmount) <= 0}
                                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
                                style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                                Send
                            </button>
                        </div>
                    </div>
                )}

                {/* TON tab */}
                {tab === 'ton' && (
                    <div className="px-4 pb-6">
                        {!wallet ? (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                                    Connect wallet to tip with TON
                                </p>
                                <button
                                    onClick={() => tonConnectUI.openModal()}
                                    className="px-6 py-3 rounded-full font-semibold text-sm"
                                    style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                                    Connect Wallet
                                </button>
                            </div>
                        ) : !video.creator_wallet ? (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--tg-hint)' }}>
                                Creator hasn't connected a wallet yet
                            </p>
                        ) : (
                            <>
                                <p className="text-xs mb-3" style={{ color: 'var(--tg-hint)' }}>
                                    Send TON to {video.creator_name}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {TON_PRESETS.map((amount) => (
                                        <button key={amount}
                                            onClick={() => handleTonTip(amount)}
                                            className="px-4 py-2 rounded-full text-sm font-medium"
                                            style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}>
                                            {amount} TON
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="Custom TON"
                                        className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                                    />
                                    <button
                                        onClick={() => { const n = parseFloat(customAmount); if (n > 0) handleTonTip(customAmount); }}
                                        disabled={!customAmount || parseFloat(customAmount) <= 0}
                                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
                                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                                        Send
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

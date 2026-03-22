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

            const { getWebApp } = await import('../lib/telegram');
            const webApp = getWebApp();
            if (!webApp) return;
            webApp.openInvoice(res.data.invoiceUrl, (status: string) => {
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
            // user rejected
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 z-40"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />

            <motion.div
                className="fixed left-0 right-0 z-[60] rounded-t-2xl overflow-y-auto"
                style={{ backgroundColor: '#1c1c1e', bottom: '56px', maxHeight: '60vh' }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-white/20" />
                </div>

                {success && (
                    <motion.div className="flex items-center justify-center py-8"
                        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <span className="text-3xl font-bold" style={{ color: '#25f4ee' }}>{success}</span>
                    </motion.div>
                )}

                {!success && (
                    <>
                        {/* Tabs */}
                        <div className="flex justify-center gap-6 px-4 py-3">
                            {(['stars', 'ton'] as const).map((t) => (
                                <button key={t} onClick={() => setTab(t)}
                                    className="text-sm font-semibold bg-transparent border-none cursor-pointer pb-1"
                                    style={{
                                        color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                                        borderBottom: tab === t ? '2px solid #fe2c55' : '2px solid transparent',
                                    }}>
                                    {t === 'stars' ? '⭐ Stars' : '💎 TON'}
                                </button>
                            ))}
                        </div>

                        {/* Stars tab */}
                        {tab === 'stars' && (
                            <div className="px-4 pb-4">
                                <p className="text-white/40 text-xs mb-4">Send Stars to {video.creator_name}</p>
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                    {STAR_PRESETS.map((amount) => (
                                        <button key={amount} onClick={() => handleStarsTip(amount)}
                                            className="py-3 rounded-xl text-sm font-semibold border-none cursor-pointer"
                                            style={{ backgroundColor: '#2c2c2e', color: '#fff' }}>
                                            {amount}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="Custom"
                                        className="flex-1 px-4 py-3 rounded-xl text-sm bg-transparent outline-none border-none"
                                        style={{ backgroundColor: '#2c2c2e', color: '#fff' }} />
                                    <button onClick={() => { const n = parseInt(customAmount); if (n > 0) handleStarsTip(n); }}
                                        disabled={!customAmount || parseInt(customAmount) <= 0}
                                        className="px-6 py-3 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-30"
                                        style={{ backgroundColor: '#fe2c55', color: '#fff' }}>
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TON tab */}
                        {tab === 'ton' && (
                            <div className="px-4 pb-4">
                                {!wallet ? (
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        <p className="text-white/40 text-sm">Connect wallet to tip with TON</p>
                                        <button onClick={() => tonConnectUI.openModal()}
                                            className="px-8 py-3 rounded-full text-sm font-semibold border-none cursor-pointer"
                                            style={{ backgroundColor: '#0a84ff', color: '#fff' }}>
                                            Connect Wallet
                                        </button>
                                    </div>
                                ) : !video.creator_wallet ? (
                                    <p className="text-white/40 text-sm text-center py-6">Creator hasn't connected a wallet</p>
                                ) : (
                                    <>
                                        <p className="text-white/40 text-xs mb-4">Send TON to {video.creator_name}</p>
                                        <div className="grid grid-cols-5 gap-2 mb-4">
                                            {TON_PRESETS.map((amount) => (
                                                <button key={amount} onClick={() => handleTonTip(amount)}
                                                    className="py-3 rounded-xl text-xs font-semibold border-none cursor-pointer"
                                                    style={{ backgroundColor: '#2c2c2e', color: '#fff' }}>
                                                    {amount}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="number" step="0.1" value={customAmount}
                                                onChange={(e) => setCustomAmount(e.target.value)}
                                                placeholder="Custom TON"
                                                className="flex-1 px-4 py-3 rounded-xl text-sm bg-transparent outline-none border-none"
                                                style={{ backgroundColor: '#2c2c2e', color: '#fff' }} />
                                            <button onClick={() => { const n = parseFloat(customAmount); if (n > 0) handleTonTip(customAmount); }}
                                                disabled={!customAmount || parseFloat(customAmount) <= 0}
                                                className="px-6 py-3 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-30"
                                                style={{ backgroundColor: '#0a84ff', color: '#fff' }}>
                                                Send
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

import { useEffect } from 'react';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import api from '../lib/api';

export default function WalletSection() {
    const wallet = useTonWallet();

    useEffect(() => {
        if (wallet) {
            const address = wallet.account.address;
            api.patch('/api/users/me', { walletAddress: address }).catch(() => {});
        }
    }, [wallet]);

    return (
        <div className="px-4 py-3">
            <TonConnectButton />
        </div>
    );
}

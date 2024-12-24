/**
 * wallet-link-app.tsx
 * 
 * A React component that runs inside Telegram WebApp, connects to a Solana wallet 
 * (Phantom/Solflare), and sends relevant data back to your Telegram Bot.
 */

import React, { useCallback, useEffect, useState } from 'react';

// Solana + Wallet Adapter
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Transaction } from '@solana/web3.js';

import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Telegram’s WebApp does not have Node-defined global CSS, so we need
// the default styles for wallet-adapter-react-ui:
require('@solana/wallet-adapter-react-ui/styles.css');

// ============ TELEGRAM TYPES ============
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        init: () => void;
        close: () => void;
        sendData: (data: string) => void;
        MainButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
      };
    };
  }
}

// ============ NETWORK + WALLET SETUP ============
const network = WalletAdapterNetwork.Mainnet; // or 'devnet'
const endpoint = clusterApiUrl(network);

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

// ============ MAIN COMPONENT ============
function WalletLinkApp() {
  const { publicKey, signMessage, signTransaction, connected } = useWallet();

  // We'll generate a new ephemeral keypair for the DApp each time the user opens this WebApp.
  const [dappKeyPair] = useState(() => nacl.box.keyPair());
  const [sharedSecret, setSharedSecret] = useState<Uint8Array>();
  const [session, setSession] = useState<string>();

  // ------------------- Encryption Helpers -------------------
  const encryptPayload = useCallback((payload: any, secret?: Uint8Array) => {
    if (!secret) throw new Error('Missing shared secret for encryption.');
    const nonce = nacl.randomBytes(24);
    const encryptedPayload = nacl.box.after(
      Buffer.from(JSON.stringify(payload)),
      nonce,
      secret
    );
    return [nonce, encryptedPayload];
  }, []);

  // (Decryption is optional if you need to receive data back from the bot
  //  but typically the flow is one-way: from WebApp -> Bot.)
  const decryptPayload = useCallback(
    (data: string, nonce: string, secret?: Uint8Array) => {
      if (!secret) throw new Error('Missing shared secret for decryption.');
      const decryptedData = nacl.box.open.after(
        bs58.decode(data),
        bs58.decode(nonce),
        secret
      );
      if (!decryptedData) {
        throw new Error('Unable to decrypt data');
      }
      return JSON.parse(Buffer.from(decryptedData).toString('utf8'));
    },
    []
  );

  // ------------------- Telegram WebApp / Lifecycle -------------------
  useEffect(() => {
    // 1) Initialize Telegram WebApp (important!)
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.init();
    }

    // 2) Optionally show/hide the main button or set up callbacks
    // Example: you can create a "Close" button in Telegram's bottom bar
    // window.Telegram.WebApp.MainButton.show();
    // window.Telegram.WebApp.MainButton.onClick(() => {
    //   window.Telegram.WebApp.close();
    // });

    return () => {
      // Cleanup if needed
    };
  }, []);

  // ------------------- Connect Flow (Sign a Message) -------------------
  const connectWithSignature = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    // Example message
    const message = `Telegram Governance Bot Login - ${Date.now()}`;
    const messageBytes = new TextEncoder().encode(message);
    const signedMessage = await signMessage(messageBytes);

    // Derive sharedSecret using user’s public key + dapp’s ephemeral secretKey
    const sharedSecretDapp = nacl.box.before(
      bs58.decode(publicKey.toBase58()),
      dappKeyPair.secretKey
    );
    setSharedSecret(sharedSecretDapp);

    // Generate a random session ID for this user (Ephemeral or you can do a real ID)
    const randomSession = bs58.encode(nacl.randomBytes(32));
    setSession(randomSession);

    // Build payload to send back
    const payload = {
      action: 'connect',
      public_key: publicKey.toBase58(),
      signature: bs58.encode(signedMessage),
      message,
      session: randomSession,
    };

    // Encrypt payload
    const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecretDapp);

    // Send data back to the Telegram bot
    window.Telegram.WebApp.sendData(
      JSON.stringify({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: bs58.encode(nonce),
        payload: bs58.encode(encryptedPayload),
      })
    );
  }, [publicKey, signMessage, dappKeyPair, encryptPayload]);

  // ------------------- Disconnect Flow -------------------
  const disconnect = useCallback(() => {
    setSharedSecret(undefined);
    setSession(undefined);

    // Optionally tell the Telegram bot we disconnected
    window.Telegram.WebApp.sendData(JSON.stringify({ action: 'disconnect' }));
  }, []);

  // ------------------- Example: Sign & Send Transaction -------------------
  const signAndSendTransaction = useCallback(async () => {
    if (!publicKey || !signTransaction || !sharedSecret || !session) return;

    // Create a dummy transaction for demonstration
    const transaction = new Transaction();
    // Add your real instructions here if needed
    transaction.feePayer = publicKey;

    // Sign the transaction with the user’s wallet
    const signedTx = await signTransaction(transaction);
    const serialized = signedTx.serialize();

    // Encrypt & send to the Bot
    const payload = {
      action: 'signAndSendTransaction',
      session,
      transaction: bs58.encode(serialized),
    };
    const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecret);

    window.Telegram.WebApp.sendData(
      JSON.stringify({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: bs58.encode(nonce),
        payload: bs58.encode(encryptedPayload),
      })
    );
  }, [publicKey, signTransaction, sharedSecret, session, encryptPayload, dappKeyPair]);

  // ------------------- Auto Connect on Wallet Adapter if Connected -------------------
  useEffect(() => {
    if (connected && publicKey) {
      // If user just connected their wallet, sign a message to confirm
      connectWithSignature();
    }
  }, [connected, publicKey, connectWithSignature]);

  // ------------------- Rendering -------------------
  return (
    <div style={{ padding: '1rem', background: '#f9f9f9' }}>
      <h1>Telegram Wallet Connector (v0)</h1>

      {!connected ? (
        <>
          <p>Please connect your Solana wallet (Phantom/Solflare):</p>
          <WalletMultiButton />
        </>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <p>Wallet connected: {publicKey?.toBase58()}</p>
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={disconnect}>Disconnect</button>
          </div>
          <div>
            <button onClick={signAndSendTransaction}>Sign & Send Transaction</button>
          </div>
        </div>
      )}
    </div>
  );
}

type MyWalletProviderProps = {
    children: React.ReactNode; // or children?: React.ReactNode if you want it optional
  };  

// ============ WRAPPER: Provide Connection + Wallets ============
export function MyWalletProvider({ children }: MyWalletProviderProps) {
    // Example config
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
  
    const wallets = [
      new PhantomWalletAdapter(), // Could add Solflare, etc.
    ];
  
    return (
      // 2) The ConnectionProvider can wrap everything
      <ConnectionProvider endpoint={endpoint}>
        {/* 3) The WalletProvider MUST have children */}
        <WalletProvider children={children} wallets={wallets} autoConnect>
          {children}
        </WalletProvider>
      </ConnectionProvider>
    );
  }
  
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Connection, Transaction, SystemProgram,Keypair} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';

const App: React.FC = () => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const [tokenA, setTokenA] = useState<PublicKey | null>(null);
    const [tokenB, setTokenB] = useState<PublicKey | null>(null);
    const [lpToken, setLpToken] = useState<PublicKey | null>(null);

    const connection = new Connection('https://api.devnet.solana.com');
    const payer = Keypair.generate();

    const createToken = async (): Promise<PublicKey | null> => {
        if (!publicKey) return null;

        const mint = await splToken.createMint(
            connection,
            payer,   // payer
            publicKey,   // mintAuthority
            null,        // freezeAuthority
            6            // decimals
        );
        console.log(`Token created: ${mint.toBase58()}`);
        return mint;
    };

    const createPool = async () => {
        const tokenAMint = await createToken();
        const tokenBMint = await createToken();
        if (tokenAMint && tokenBMint) {
            setTokenA(tokenAMint);
            setTokenB(tokenBMint);

            const lpMint = await createToken();
            setLpToken(lpMint);

            // Here you'd set up the actual liquidity pool logic, possibly using
            // an existing protocol or writing custom smart contracts.
        }
    };

    const addLiquidity = async (amountA: number, amountB: number) => {
        if (!lpToken || !tokenA || !tokenB || !publicKey) return;

        // Get the associated token accounts for the pool vaults and the user's LP token account
        const transaction = new Transaction();
        // const payer = publicKey;

        const poolVaultA = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            tokenA,
            publicKey
        );

        const poolVaultB = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            tokenB,
            publicKey
        );

        const lpTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            lpToken,
            publicKey
        );

        // Add the transfer and mint instructions to the transaction
        transaction.add(
            splToken.createTransferInstruction(
                poolVaultA.address,
                lpTokenAccount.address,
                publicKey,
                amountA
            ),
            splToken.createTransferInstruction(
                poolVaultB.address,
                lpTokenAccount.address,
                publicKey,
                amountB
            ),
            splToken.createMintToInstruction(
                lpToken,
                lpTokenAccount.address,
                publicKey,
                amountA
            )
        );

        // Sign and send the transaction
        const signedTransaction = await signTransaction!(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature);
        console.log(`Liquidity added: ${signature}`);
    };

    return (
        <div>
            <button onClick={createPool}>Create Liquidity Pool</button>
            <button onClick={() => addLiquidity(100, 100)}>Add Liquidity</button>
        </div>
    );
};

export default App;

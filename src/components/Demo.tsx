"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useDisconnect,
  useConnect,
  useSwitchChain,
  useChainId,
} from "wagmi";

import { ShareButton } from "./ui/Share";

import { config } from "~/components/providers/WagmiProvider";
import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, degen, sepolia, optimism, unichain } from "viem/chains";
import { BaseError, UserRejectedRequestError } from "viem";
import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { Footer } from "~/components/ui/Footer";
import { USE_WALLET, APP_NAME } from "~/lib/constants";

export type Tab = "home" | "actions" | "context" | "wallet";

interface NeynarUser {
  fid: number;
  score: number;
}

interface Match {
  url: string;
  event: string;
  round: string;
  teams: { name: string; score: string }[];
}

export default function Demo(
  { title }: { title?: string } = { title: "Frames v2 Demo" }
) {
  const { isSDKLoaded, context, added, notificationDetails, actions } =
    useMiniApp();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendNotificationResult, setSendNotificationResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [neynarUser, setNeynarUser] = useState<NeynarUser | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    console.log("isSDKLoaded", isSDKLoaded);
    console.log("context", context);
    console.log("address", address);
    console.log("isConnected", isConnected);
    console.log("chainId", chainId);
  }, [context, address, isConnected, chainId, isSDKLoaded]);

  // Fetch match data
  useEffect(() => {
    fetch("http://localhost:3001/api/matches")
      .then((res) => res.json())
      .then((data) => {
        console.log("Match data:", data);
        setMatches(data.matches);
      })
      .catch((err) => console.error("Error fetching match data:", err));
  }, []);

  // Fetch Neynar user object when context is available
  useEffect(() => {
    const fetchNeynarUserObject = async () => {
      if (context?.user?.fid) {
        try {
          const response = await fetch(`/api/users?fids=${context.user.fid}`);
          const data = await response.json();
          if (data.users?.[0]) {
            setNeynarUser(data.users[0]);
          }
        } catch (error) {
          console.error("Failed to fetch Neynar user object:", error);
        }
      }
    };

    fetchNeynarUserObject();
  }, [context?.user?.fid]);

  const {
    sendTransaction,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

  const {
    signTypedData,
    error: signTypedError,
    isError: isSignTypedError,
    isPending: isSignTypedPending,
  } = useSignTypedData();

  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();

  const nextChain = useMemo(() => {
    if (chainId === base.id) {
      return optimism;
    } else if (chainId === optimism.id) {
      return degen;
    } else if (chainId === degen.id) {
      return sepolia;
    } else if (chainId === sepolia.id) {
      return unichain;
    } else {
      return base;
    }
  }, [chainId]);

  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: nextChain.id });
  }, [switchChain, nextChain.id]);

  const sendNotification = useCallback(async () => {
    setSendNotificationResult("");
    if (!notificationDetails || !context) {
      return;
    }

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          notificationDetails,
        }),
      });

      if (response.status === 200) {
        setSendNotificationResult("Success");
        return;
      } else if (response.status === 429) {
        setSendNotificationResult("Rate limited");
        return;
      }

      const data = await response.text();
      setSendNotificationResult(`Error: ${data}`);
    } catch (error) {
      setSendNotificationResult(`Error: ${error}`);
    }
  }, [context, notificationDetails]);

  const sendTx = useCallback(() => {
    sendTransaction(
      {
        // call yoink() on Yoink contract
        to: "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878",
        data: "0x9846cd9efc000023c0",
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
      }
    );
  }, [sendTransaction]);

  const signTyped = useCallback(async () => {
    if (!address) {
      return;
    }
    signTypedData({
      account: address as `0x${string}`,
      domain: {
        name: APP_NAME,
        version: "1",
        chainId,
      },
      types: {
        Message: [{ name: "content", type: "string" }],
      },
      message: {
        content: `Hello from ${APP_NAME}!`,
      },
      primaryType: "Message",
    });
  }, [address, chainId, signTypedData]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="mx-auto py-2 px-4 pb-20">
        <Header neynarUser={neynarUser} />

        <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>

        {activeTab === "home" && (
  <div className="min-h-[calc(100vh-200px)] px-4 py-6">
    {/* Hero Section */}
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-red-500 font-medium text-sm">LIVE MATCHES</span>
      </div>
      <h2 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text mb-2">
        Valorant Esports
      </h2>
      <p className="text-muted-foreground text-lg">Follow your favorite teams and matches</p>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-3 gap-3 mb-8">
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-blue-500">{matches.length}</div>
        <div className="text-xs text-blue-400">Live Matches</div>
      </div>
      <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-green-500">
          {matches.reduce((acc, match) => acc + match.teams.length, 0)}
        </div>
        <div className="text-xs text-green-400">Active Teams</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-purple-500">
          {new Set(matches.map(m => m.event)).size}
        </div>
        <div className="text-xs text-purple-400">Tournaments</div>
      </div>
    </div>

    {/* Matches Container */}
    <div className="space-y-4">
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No matches available</h3>
          <p className="text-muted-foreground max-w-sm">
            Check back later for upcoming Valorant matches and tournaments
          </p>
          <button className="mt-6 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200">
            Refresh Matches
          </button>
        </div>
      ) : (
        matches.map((match, index) => {
          const id = match.url.split('/')[3] || index.toString();
          const team1 = match.teams[0] || { name: 'TBD', score: '0' };
          const team2 = match.teams[1] || { name: 'TBD', score: '0' };
          
          return (
            <div
              key={id}
              className="group relative overflow-hidden bg-gradient-to-br from-background to-background/50 border-2 border-border/50 rounded-3xl p-6 hover:border-red-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.3),transparent_50%)]"></div>
              </div>
              
              {/* Match Header */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 font-medium text-sm uppercase tracking-wide">
                    {match.event}
                  </span>
                </div>
                <div className="px-3 py-1 bg-muted/50 rounded-full">
                  <span className="text-xs text-muted-foreground font-medium">
                    {match.round}
                  </span>
                </div>
              </div>

              {/* Teams Section */}
              <div className="flex items-center justify-between mb-6 relative z-10">
                {/* Team 1 */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {team1.name.charAt(0)}
                      </span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{team1.score}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{team1.name}</h3>
                    <p className="text-muted-foreground text-sm">Team Alpha</p>
                  </div>
                </div>

                {/* VS Divider */}
                <div className="mx-6 flex items-center">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">VS</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="flex items-center gap-4 flex-1 flex-row-reverse">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {team2.name.charAt(0)}
                      </span>
                    </div>
                    <div className="absolute -top-1 -left-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{team2.score}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-lg text-foreground">{team2.name}</h3>
                    <p className="text-muted-foreground text-sm">Team Beta</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  window.location.href = `/matches/${id}?url=${encodeURIComponent(match.url)}`;
                }}
                className="w-full relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl group-hover:shadow-red-500/25"
              >
                <div className="absolute inset-0 bg-white/20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <span>Watch Match</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </button>
            </div>
          );
        })
      )}
    </div>

    {/* Footer Info */}
    {matches.length > 0 && (
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-muted-foreground text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    )}
  </div>
)}


        {activeTab === "actions" && (
          <div className="space-y-3 px-6 w-full max-w-md mx-auto">
            <ShareButton
              buttonText="Share Mini App"
              cast={{
                text: "Check out this awesome frame @1 @2 @3! 🚀🪐",
                bestFriends: true,
                embeds: [
                  `${process.env.NEXT_PUBLIC_URL}/share/${
                    context?.user?.fid || ""
                  }`,
                ],
              }}
              className="w-full"
            />

            <Button
              onClick={() =>
                actions.openUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
              }
              className="w-full"
            >
              Open Link
            </Button>

            <Button onClick={actions.close} className="w-full">
              Close Mini App
            </Button>

            <Button
              onClick={actions.addMiniApp}
              disabled={added}
              className="w-full"
            >
              Add Mini App to Client
            </Button>

            {sendNotificationResult && (
              <div className="text-sm w-full">
                Send notification result: {sendNotificationResult}
              </div>
            )}
            <Button
              onClick={sendNotification}
              disabled={!notificationDetails}
              className="w-full"
            >
              Send notification
            </Button>

            <Button
              onClick={async () => {
                if (context?.user?.fid) {
                  const shareUrl = `${process.env.NEXT_PUBLIC_URL}/share/${context.user.fid}`;
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              disabled={!context?.user?.fid}
              className="w-full"
            >
              {copied ? "Copied!" : "Copy share URL"}
            </Button>
          </div>
        )}

        {activeTab === "context" && (
          <div className="mx-6">
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              Context
            </h2>
            <div className="p-4 bg-card text-card-foreground rounded-lg border border-border">
              <pre className="font-mono text-xs whitespace-pre-wrap break-words w-full">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "wallet" && USE_WALLET && (
          <div className="space-y-3 px-6 w-full max-w-md mx-auto">
            {address && (
              <div className="text-xs w-full">
                Address:{" "}
                <pre className="inline w-full">{truncateAddress(address)}</pre>
              </div>
            )}

            {chainId && (
              <div className="text-xs w-full">
                Chain ID: <pre className="inline w-full">{chainId}</pre>
              </div>
            )}

            {isConnected ? (
              <Button onClick={() => disconnect()} className="w-full">
                Disconnect
              </Button>
            ) : context ? (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full"
              >
                Connect
              </Button>
            ) : (
              <div className="space-y-3 w-full">
                <Button
                  onClick={() => connect({ connector: connectors[1] })}
                  className="w-full"
                >
                  Connect Coinbase Wallet
                </Button>
                <Button
                  onClick={() => connect({ connector: connectors[2] })}
                  className="w-full"
                >
                  Connect MetaMask
                </Button>
              </div>
            )}

            <SignEvmMessage />

            {isConnected && (
              <>
                <SendEth />
                <Button
                  onClick={sendTx}
                  disabled={!isConnected || isSendTxPending}
                  isLoading={isSendTxPending}
                  className="w-full"
                >
                  Send Transaction (contract)
                </Button>
                {isSendTxError && renderError(sendTxError)}
                {txHash && (
                  <div className="text-xs w-full">
                    <div>Hash: {truncateAddress(txHash)}</div>
                    <div>
                      Status:{" "}
                      {isConfirming
                        ? "Confirming..."
                        : isConfirmed
                        ? "Confirmed!"
                        : "Pending"}
                    </div>
                  </div>
                )}
                <Button
                  onClick={signTyped}
                  disabled={!isConnected || isSignTypedPending}
                  isLoading={isSignTypedPending}
                  className="w-full"
                >
                  Sign Typed Data
                </Button>
                {isSignTypedError && renderError(signTypedError)}
                <Button
                  onClick={handleSwitchChain}
                  disabled={isSwitchChainPending}
                  isLoading={isSwitchChainPending}
                  className="w-full"
                >
                  Switch to {nextChain.name}
                </Button>
                {isSwitchChainError && renderError(switchChainError)}
              </>
            )}
          </div>
        )}

        <Footer
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showWallet={USE_WALLET}
        />
      </div>
    </div>
  );
}

function SignEvmMessage() {
  const { isConnected, address } = useAccount();
  const { connectAsync } = useConnect();
  const {
    signMessage,
    data: signature,
    error: signError,
    isError: isSignError,
    isPending: isSignPending,
  } = useSignMessage();

  const handleSignMessage = useCallback(async () => {
    if (!isConnected) {
      const result = await connectAsync({
        chainId: base.id,
        connector: config.connectors[0],
      });
      const connectedAccount = result.accounts?.[0] as `0x${string}` | undefined;
      if (!connectedAccount) return;
      signMessage({ account: connectedAccount, message: "Hello from Frames v2!" });
      return;
    }

    if (!address) return;
    signMessage({ account: address as `0x${string}`, message: "Hello from Frames v2!" });
  }, [connectAsync, isConnected, signMessage, address]);

  return (
    <>
      <Button
        onClick={handleSignMessage}
        disabled={isSignPending}
        isLoading={isSignPending}
      >
        Sign Message
      </Button>
      {isSignError && renderError(signError)}
      {signature && (
        <div className="mt-2 text-xs">
          <div>Signature: {signature}</div>
        </div>
      )}
    </>
  );
}

function SendEth() {
  const { isConnected, chainId } = useAccount();
  const {
    sendTransaction,
    data,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: data,
    });

  const toAddr = useMemo(() => {
    // Protocol guild address
    return chainId === base.id
      ? "0x32e3C7fD24e175701A35c224f2238d18439C7dBC"
      : "0xB3d8d7887693a9852734b4D25e9C0Bb35Ba8a830";
  }, [chainId]);

  const handleSend = useCallback(() => {
    sendTransaction({
      to: toAddr,
      value: 1n,
    });
  }, [toAddr, sendTransaction]);

  return (
    <>
      <Button
        onClick={handleSend}
        disabled={!isConnected || isSendTxPending}
        isLoading={isSendTxPending}
      >
        Send Transaction (eth)
      </Button>
      {isSendTxError && renderError(sendTxError)}
      {data && (
        <div className="mt-2 text-xs">
          <div>Hash: {truncateAddress(data)}</div>
          <div>
            Status:{" "}
            {isConfirming
              ? "Confirming..."
              : isConfirmed
              ? "Confirmed!"
              : "Pending"}
          </div>
        </div>
      )}
    </>
  );
}

const renderError = (error: Error | null) => {
  if (!error) return null;

  if (error.message.includes("User rejected")) {
    return <div className="text-red-500 text-xs mt-1">Rejected by user.</div>;
  }

  return <div className="text-red-500 text-xs mt-1">{error.message}</div>;
};

"use client";

import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  parseEther,
  BaseError,
  UserRejectedRequestError,
} from "viem";
import { truncateAddress } from "~/lib/truncateAddress";
import { Button } from "~/components/ui/Button";

export default function MatchDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { context, actions } = useMiniApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lastRoundWinner, setLastRoundWinner] = useState<string | null>(null);
  const [match, setMatch] = useState<{ url: string; event: string; round: string; teams: { name: string; score: string }[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [selectedKills, setSelectedKills] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { sendTransaction } = useSendTransaction();

  const getVideoId = (url: string) => {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("v");
  };

  const videoUrl = searchParams.get("url");
  const videoId = videoUrl ? getVideoId(videoUrl) : "P4mz4bTXi8g";

  useEffect(() => {
    const fetchRoundWinner = async () => {
      if (!videoUrl) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:3001/api/matches`);
        if (!response.ok) {
          throw new Error('Failed to fetch round winner');
        }
        const data = await response.json();
        setLastRoundWinner(data.winner);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoundWinner();
  }, [videoUrl]);

  useEffect(() => {
    const fetchData = async () => {
      if (!videoUrl) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const matchesResponse = await fetch(`http://localhost:3001/api/matches`);
        if (!matchesResponse.ok) {
          throw new Error('Failed to fetch matches');
        }
        const matchesData = await matchesResponse.json();
        const selectedMatch = matchesData.matches.find((m: any) => m.url === videoUrl);
        if (selectedMatch) {
          setMatch(selectedMatch);
        }
        
        const winnerResponse = await fetch(`http://localhost:3001/api/round-winner?url=${encodeURIComponent(videoUrl)}`);
        if (!winnerResponse.ok) {
          throw new Error('Failed to fetch round winner');
        }
        const winnerData = await winnerResponse.json();
        setLastRoundWinner(winnerData.winner);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [videoUrl]);

  useEffect(() => {
    if (videoUrl) {
      actions?.openUrl(videoUrl);
    }
  }, [videoUrl, actions]);

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted"
    >
      <div className="mx-auto py-4 px-4 pb-8">
        <Header />
        
        {/* Enhanced Back Button */}
        <div className="w-full max-w-md mx-auto mb-6">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm px-4 py-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm text-foreground hover:bg-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
            Back to Matches
          </button>
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* Match Header Card */}
          <div className="bg-gradient-to-r from-card to-card/90 backdrop-blur-sm text-foreground border border-border/50 rounded-2xl p-6 mb-6 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-3 py-1 w-fit mx-auto">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                LIVE MATCH
              </div>
              
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {match ? `${match.teams[0].name} vs ${match.teams[1].name}` : `Match ${params.id}`}
              </h1>
              
              {match && (
                <div className="text-sm text-muted-foreground font-medium">
                  {match.event} • {match.round}
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-6 text-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading match data...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                  <span className="text-destructive font-bold text-sm">!</span>
                </div>
                <p className="text-destructive font-medium">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Last Round Winner */}
          {lastRoundWinner && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 animate-pulse"></div>
              <div className="relative text-center">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                  🏆 Last Round Champion
                </div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300">
                  {lastRoundWinner}
                </div>
              </div>
            </div>
          )}

          {match && (
            <div className="space-y-8">
              {/* Match Winner Betting */}
              <BettingSection
                title="Who will win the match?"
                subtitle="Place your bet on the match winner"
                icon="🎯"
                teams={match.teams}
                selected={selectedWinner}
                onSelect={setSelectedWinner}
                showScores={true}
              />

              {selectedWinner && (
                <Bet
                  selected={selectedWinner}
                  buttonText="Place Bet on Winner"
                />
              )}

              {/* Most Kills Betting */}
              <BettingSection
                title="Who will get the most kills?"
                subtitle="Bet on the team with highest eliminations"
                icon="⚔️"
                teams={match.teams}
                selected={selectedKills}
                onSelect={setSelectedKills}
                showScores={false}
              />

              {selectedKills && (
                <Bet
                  selected={selectedKills}
                  buttonText="Place Bet on Most Kills"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BettingSection({
  title,
  subtitle,
  icon,
  teams,
  selected,
  onSelect,
  showScores
}: {
  title: string;
  subtitle: string;
  icon: string;
  teams: { name: string; score: string }[];
  selected: string | null;
  onSelect: (team: string) => void;
  showScores: boolean;
}) {
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl">
      {/* Section Header */}
      <div className="text-center mb-6">
        <div className="text-2xl mb-3">{icon}</div>
        <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Team Selection */}
      <div className="grid grid-cols-2 gap-4">
        {teams.map((team, index) => (
          <button
            key={team.name}
            onClick={() => onSelect(team.name)}
            className={`
              relative group p-6 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
              ${selected === team.name 
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/25' 
                : 'border-border/50 bg-card/50 hover:bg-card hover:border-border'
              }
            `}
          >
            {/* Selection Indicator */}
            {selected === team.name && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">✓</span>
              </div>
            )}

            <div className="text-center">
              <div className="font-bold text-foreground mb-2">{team.name}</div>
              {showScores && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-1 inline-block">
                  Score: {team.score}
                </div>
              )}
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function renderError(error: Error | null) {
  return error ? (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-3">
      <div className="flex items-center gap-2">
        <span className="text-destructive font-bold">⚠</span>
        <div className="text-destructive text-sm font-medium">
          {error instanceof BaseError
            ? (error as BaseError).shortMessage || error.message
            : error instanceof UserRejectedRequestError
            ? "Transaction was rejected"
            : error?.message ?? "An unexpected error occurred"}
        </div>
      </div>
    </div>
  ) : null;
}

function Bet({
  selected,
  buttonText,
}: {
  selected: string;
  buttonText: string;
}) {
  const { isConnected } = useAccount();
  const {
    data,
    error,
    isPending,
    sendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: data,
    });

  const handleBet = () => {
    sendTransaction({
      to: "0x000000000000000000000000000000000000dEaD",
      value: parseEther("0.0001"),
    });
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
      {/* Bet Summary */}
      <div className="text-center mb-4">
        <div className="text-sm text-muted-foreground mb-1">Your Selection</div>
        <div className="font-bold text-lg text-foreground">{selected}</div>
        <div className="text-xs text-muted-foreground mt-2">
          Bet Amount: 0.0001 ETH
        </div>
      </div>

      <Button
        onClick={handleBet}
        disabled={!isConnected || isPending}
        isLoading={isPending}
        className="w-full py-4 font-semibold text-base rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        {isPending ? 'Processing...' : buttonText}
      </Button>

      {!isConnected && (
        <div className="text-center mt-3 text-sm text-muted-foreground">
          Please connect your wallet to place bets
        </div>
      )}

      {renderError(error)}

      {data && (
        <div className="mt-4 p-4 bg-card/50 rounded-xl border border-border/50">
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction:</span>
              <span className="font-mono">{truncateAddress(data)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${
                isConfirmed ? 'text-green-600' : isConfirming ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {isConfirming ? "Confirming..." : isConfirmed ? "✓ Confirmed!" : "⏳ Pending"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
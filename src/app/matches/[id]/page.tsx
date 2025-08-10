"use client";

import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";

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
        setLastRoundWinner(data.winner); // Assuming API returns { winner: string }
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
        // Fetch matches
        const matchesResponse = await fetch(`http://localhost:3001/api/matches`);
        if (!matchesResponse.ok) {
          throw new Error('Failed to fetch matches');
        }
        const matchesData = await matchesResponse.json();
        const selectedMatch = matchesData.matches.find((m: any) => m.url === videoUrl);
        if (selectedMatch) {
          setMatch(selectedMatch);
        }
        
        // Fetch round winner
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
    >
      <div className="mx-auto py-2 px-4 pb-6">
        <Header />
        <div className="w-full max-w-sm mx-auto mb-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted"
          >
            ← Back
          </button>
        </div>
        <div className="w-full max-w-sm mx-auto bg-background text-foreground border border-border rounded-2xl p-4 space-y-4 shadow-xl">
          <h1 className="text-center text-xl font-semibold">{match ? `${match.teams[0].name} vs ${match.teams[1].name}` : `Match ${params.id}`}</h1>

          {isLoading && <p className="text-center text-muted-foreground">Loading last round winner...</p>}
          {error && <p className="text-center text-destructive">Error: {error}</p>}
          {lastRoundWinner && <div className="bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-3 text-center font-semibold shadow-md">Last Round Winner: {lastRoundWinner}</div>}

          {match && (
            <div className="space-y-5">
              <div className="text-center text-muted-foreground">{match.event} - {match.round}</div>
              
              {/* Question 1: Who will win the match? */}
              <div className="bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-3 text-center font-semibold shadow-md">
                Who will win the match?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSelectedWinner(match.teams[0].name)} 
                  className={`bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-6 text-center font-medium shadow-md hover:shadow-lg transition-shadow hover:bg-accent ${selectedWinner === match.teams[0].name ? 'bg-accent' : ''}`}
                >
                  {match.teams[0].name} ({match.teams[0].score})
                </button>
                <button 
                  onClick={() => setSelectedWinner(match.teams[1].name)} 
                  className={`bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-6 text-center font-medium shadow-md hover:shadow-lg transition-shadow hover:bg-accent ${selectedWinner === match.teams[1].name ? 'bg-accent' : ''}`}
                >
                  {match.teams[1].name} ({match.teams[1].score})
                </button>
              </div>

              {selectedWinner && (
                <button 
                  onClick={() => {
                    if (isConnected && address) {
                      sendTransaction({
                        to: '0x000000000000000000000000000000000000dEaD', // Placeholder betting contract
                        value: parseEther('0.0001'), // 0.0001 ETH bet
                      });
                    } else {
                      alert('Please connect your wallet');
                    }
                  }}
                  className="w-full mt-2 bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                >
                  Place Bet on Winner
                </button>
              )}

              {/* Question 2: Who will get the most kills? */}
              <div className="bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-3 text-center font-semibold shadow-md">
                Who will get the most kills?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSelectedKills(match.teams[0].name)} 
                  className={`bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-6 text-center font-medium shadow-md hover:shadow-lg transition-shadow hover:bg-accent ${selectedKills === match.teams[0].name ? 'bg-accent' : ''}`}
                >
                  {match.teams[0].name}
                </button>
                <button 
                  onClick={() => setSelectedKills(match.teams[1].name)} 
                  className={`bg-card text-card-foreground border-[3px] border-border rounded-xl px-6 py-6 text-center font-medium shadow-md hover:shadow-lg transition-shadow hover:bg-accent ${selectedKills === match.teams[1].name ? 'bg-accent' : ''}`}
                >
                  {match.teams[1].name}
                </button>
              </div>

              {selectedKills && (
                <button 
                  onClick={() => {
                    if (isConnected && address) {
                      sendTransaction({
                        to: '0x000000000000000000000000000000000000dEaD', // Placeholder betting contract
                        value: parseEther('0.0001'), // 0.0001 ETH bet
                      });
                    } else {
                      alert('Please connect your wallet');
                    }
                  }}
                  className="w-full mt-2 bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                >
                  Place Bet on Most Kills
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



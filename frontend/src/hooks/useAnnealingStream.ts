import { useState, useRef, useCallback } from 'react';
import type { OptimizeRequest, StreamFrame, OptimizationResult, PlantedTree } from '../types';

export function useAnnealingStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<StreamFrame | null>(null);
  const [finalResult, setFinalResult] = useState<OptimizationResult | null>(null);
  const [liveTrees, setLiveTrees] = useState<PlantedTree[]>([]);
  const [history, setHistory] = useState<
    { iteration: number; score: number; temperature: number; trees: number; carbon: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const stopStream = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    (request: OptimizeRequest) => {
      stopStream();
      setError(null);
      setFinalResult(null);
      setHistory([]);
      setLiveTrees([]);
      setIsStreaming(true);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/optimize/stream`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify(request));
        };

        ws.onmessage = (event) => {
          try {
            const frame: StreamFrame = JSON.parse(event.data);
            setCurrentFrame(frame);

            if (frame.trees) {
              setLiveTrees(frame.trees);
            }

            if (frame.type === 'progress') {
              setHistory((prev) => [
                ...prev,
                {
                  iteration: frame.iteration,
                  score: frame.current_score,
                  temperature: frame.temperature,
                  trees: frame.trees_planted,
                  carbon: frame.carbon_estimate,
                },
              ]);
            } else if (frame.type === 'complete') {
              setIsStreaming(false);
              if (frame.final_result) {
                setFinalResult(frame.final_result);
                setLiveTrees(frame.final_result.trees);
              }
              ws.close();
            } else if (frame.type === 'error') {
              setError(frame.message || 'Stream simulation encountered an error');
              setIsStreaming(false);
              ws.close();
            }
          } catch (parseErr) {
            console.error('Failed to parse stream frame', parseErr);
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          setError('Failed to connect to simulation WebSocket');
          setIsStreaming(false);
        };

        ws.onclose = () => {
          setIsStreaming(false);
        };
      } catch (err: any) {
        setError(err.message || 'Could not initiate streaming');
        setIsStreaming(false);
      }
    },
    [stopStream]
  );

  return {
    isStreaming,
    currentFrame,
    finalResult,
    setFinalResult,
    liveTrees,
    setLiveTrees,
    history,
    error,
    startStream,
    stopStream,
  };
}

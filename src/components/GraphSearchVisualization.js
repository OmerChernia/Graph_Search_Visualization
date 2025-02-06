"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const GraphSearchVisualization = () => {
  const graph = {
    A: { x: 50, y: 50, neighbors: ['B', 'C'] },
    B: { x: 150, y: 50, neighbors: ['A', 'D', 'E'] },
    C: { x: 50, y: 150, neighbors: ['A', 'F'] },
    D: { x: 150, y: 150, neighbors: ['B', 'F'] },
    E: { x: 250, y: 50, neighbors: ['B', 'G'] },
    F: { x: 150, y: 250, neighbors: ['C', 'D', 'G'] },
    G: { x: 250, y: 150, neighbors: ['E', 'F'] }
  };

  const [algorithm, setAlgorithm] = useState('bfs');
  const [open, setOpen] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [status, setStatus] = useState('not_started');
  const goalNode = 'G';
  const [visited, setVisited] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [depthLimit, setDepthLimit] = useState(3);
  const [nodeDepths, setNodeDepths] = useState({});

  const canvasRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const saveState = () => {
    setHistory(prev => [...prev, {
      open: [...open],
      current,
      visited: new Set(visited),
      stepCount,
      status,
      nodeDepths: { ...nodeDepths }
    }]);
  };

  const goBack = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setOpen(previousState.open);
      setCurrent(previousState.current);
      setVisited(previousState.visited);
      setStepCount(previousState.stepCount);
      setStatus(previousState.status);
      setNodeDepths(previousState.nodeDepths);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const initializeSearch = () => {
    setOpen(['A']);
    setVisited(new Set());
    setCurrent(null);
    setStepCount(0);
    setStatus('running');
    setIsRunning(false);
    setHistory([]);
    setNodeDepths({ A: 0 });
  };

  const resetSearch = () => {
    setOpen([]);
    setVisited(new Set());
    setCurrent(null);
    setStepCount(0);
    setStatus('not_started');
    setIsRunning(false);
    setHistory([]);
    setNodeDepths({});
  };

  const step = () => {
    saveState();

    if (open.length === 0) {
      setStatus('failure');
      setIsRunning(false);
      return;
    }

    const node = open[0];
    const currentDepth = nodeDepths[node] || 0;
    const newOpen = open.slice(1);
    setCurrent(node);
    setVisited(prev => new Set([...prev, node]));

    if (node === goalNode) {
      setOpen(newOpen);
      setStatus('success');
      setIsRunning(false);
      return;
    }

    // For DLS, only expand nodes that haven't reached the depth limit
    let newNodes = [];
    if (algorithm !== 'dls' || currentDepth < depthLimit) {
      newNodes = graph[node].neighbors.filter(n => !visited.has(n) && !open.includes(n));
      
      // Set depths for new nodes
      newNodes.forEach(n => {
        setNodeDepths(prev => ({
          ...prev,
          [n]: currentDepth + 1
        }));
      });
    }
    
    setOpen(algorithm === 'bfs' 
      ? [...newOpen, ...newNodes]  // BFS: Add to end
      : [...newNodes, ...newOpen]  // DFS/DLS: Add to front
    );
    
    setStepCount(prev => prev + 1);
  };

  const drawArrow = (start, end, ctx) => {
    const headLength = 10;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(end.x - headLength * Math.cos(angle - Math.PI / 6), 
               end.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6),
               end.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  useEffect(() => {
    if (!isClient) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw edges first
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    Object.entries(graph).forEach(([node, data]) => {
      data.neighbors.forEach(neighbor => {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        ctx.lineTo(graph[neighbor].x, graph[neighbor].y);
        ctx.stroke();
      });
    });

    // Draw nodes
    Object.entries(graph).forEach(([node, data]) => {
      ctx.beginPath();
      ctx.arc(data.x, data.y, 15, 0, 2 * Math.PI);

      // Set node color based on its state
      if (node === current) {
        ctx.fillStyle = '#ff0000'; // Current node - Red
      } else if (node === goalNode && visited.has(node)) {
        ctx.fillStyle = '#00ff00'; // Goal node when reached - Green
      } else if (visited.has(node)) {
        ctx.fillStyle = '#ffcc00'; // Visited nodes - Yellow
      } else if (open.includes(node)) {
        ctx.fillStyle = '#00ccff'; // Nodes in open queue - Light Blue
      } else {
        ctx.fillStyle = '#ffffff'; // Unvisited nodes - White
      }

      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Draw node label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node, data.x, data.y);
    });
  }, [isClient, graph, current, visited, open, goalNode]); // Add all dependencies

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Graph Search Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isClient && (
            <>
              <div className="flex space-x-4">
              <Select 
                value={algorithm} 
                onValueChange={(value) => {
                  setAlgorithm(value);
                  resetSearch();
                }}
              >
                <SelectTrigger className="w-[180px] text-black">
                  <SelectValue placeholder="Select algorithm" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  <SelectItem value="bfs">Breadth-First Search</SelectItem>
                  <SelectItem value="dfs">Depth-First Search</SelectItem>
                  <SelectItem value="dls">Depth-Limited Search</SelectItem>
                </SelectContent>
              </Select>
                {algorithm === 'dls' && (
                  <div className="flex items-center space-x-2">
                    <span>Depth Limit (K):</span>
                    <Input
                      type="number"
                      value={depthLimit}
                      onChange={(e) => setDepthLimit(parseInt(e.target.value) || 0)}
                      className="w-20"
                      min="0"
                    />
                  </div>
                )}
                <Button onClick={initializeSearch} disabled={status === 'running'}>
                  Initialize Queue
                </Button>
                <Button onClick={step} disabled={status !== 'running'}>
                  Step
                </Button>
                <Button onClick={goBack} disabled={status !== 'running' || history.length === 0}>
                  Back
                </Button>
                <Button onClick={() => setIsRunning(true)} disabled={status !== 'running'}>
                  Start
                </Button>
                <Button onClick={() => setIsRunning(false)} disabled={!isRunning}>
                  Pause
                </Button>
                <Button onClick={resetSearch} disabled={status === 'not_started'}>
                  Reset
                </Button>
              </div>

              <div className="border rounded p-4">
                <canvas 
                  ref={canvasRef}
                  id="graphCanvas" 
                  width="300" 
                  height="300" 
                  className="border" 
                />
              </div>

              <div className="space-y-2">
                <p><strong>Algorithm:</strong> {algorithm === 'bfs' ? 'Breadth-First Search' : algorithm === 'dfs' ? 'Depth-First Search' : 'Depth-Limited Search'}</p>
                <p><strong>Queue Type:</strong> {algorithm === 'bfs' ? 'FIFO (add to end)' : 'LIFO (add to front)'}</p>
                {algorithm === 'dls' && <p><strong>Depth Limit (K):</strong> {depthLimit}</p>}
                <p><strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}</p>
                <p><strong>Step Count:</strong> {stepCount}</p>
                <p><strong>Current Node:</strong> {current || 'None'}</p>
                <p><strong>Open Queue:</strong> [{open.join(', ')}]</p>
                <p><strong>Visited Nodes:</strong> [{Array.from(visited).join(', ')}]</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Export with dynamic import to disable SSR
export default dynamic(() => Promise.resolve(GraphSearchVisualization), {
  ssr: false
});
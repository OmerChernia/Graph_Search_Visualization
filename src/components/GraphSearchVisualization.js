"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const GraphSearchVisualization = () => {
  const [graph, setGraph] = useState({
    A: { x: 50, y: 50, neighbors: ['B', 'C'] },
    B: { x: 150, y: 50, neighbors: ['A', 'D', 'E'] },
    C: { x: 50, y: 150, neighbors: ['A', 'F'] },
    D: { x: 150, y: 150, neighbors: ['B', 'F'] },
    E: { x: 250, y: 50, neighbors: ['B', 'G'] },
    F: { x: 150, y: 250, neighbors: ['C', 'D', 'G'] },
    G: { x: 250, y: 150, neighbors: ['E', 'F'] }
  });

  const [startNode, setStartNode] = useState('A');
  const [goalNodes, setGoalNodes] = useState(new Set(['G']));
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [newNodeId, setNewNodeId] = useState('');
  const [connectingNode, setConnectingNode] = useState(null);

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

  const [autoRun, setAutoRun] = useState(false);

  const canvasRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  const [currentDepthLimit, setCurrentDepthLimit] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNodeConnection = (nodeId) => {
    if (!editMode) return;

    if (!connectingNode) {
      // First node selected - start connection
      setConnectingNode(nodeId);
    } else if (connectingNode !== nodeId) {
      // Second node selected - complete connection
      toggleEdge(connectingNode, nodeId);
      setConnectingNode(null);
    } else {
      // Same node clicked - cancel connection
      setConnectingNode(null);
    }
  };

  const handleNodeClick = (nodeId, event) => {
    if (!editMode || hasDragged) return;
    event.stopPropagation();
    if (event.button === 2) {
      event.preventDefault();
      toggleGoalNode(nodeId);
    } else if (event.detail === 2) {
      setStartNode(nodeId);
    } else {
      handleNodeConnection(nodeId);
    }
  };

  const handleNodeDragStart = (nodeId, event) => {
    if (!editMode) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    dragStartPos.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    setDraggingNode(nodeId);
    setIsDragging(true);
    setHasDragged(false);
  };

  const handleNodeDrag = (event) => {
    if (!draggingNode || !editMode) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (Math.abs(x - dragStartPos.current.x) > 5 || Math.abs(y - dragStartPos.current.y) > 5) {
      setHasDragged(true);
      setGraph(prev => ({
        ...prev,
        [draggingNode]: { ...prev[draggingNode], x, y }
      }));
    }
  };

  const handleNodeDragEnd = (event) => {
    if (!draggingNode) return;
    setDraggingNode(null);
    setIsDragging(false);
    setHasDragged(false);
  };

  const handleCanvasMouseDown = (event) => {
    if (!editMode) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicked on existing node
    Object.entries(graph).forEach(([nodeId, data]) => {
      const dx = data.x - x;
      const dy = data.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        handleNodeDragStart(nodeId, event);
      }
    });
  };

  const handleCanvasClick = (event) => {
    if (!editMode || hasDragged) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let clickedNode = null;
    Object.entries(graph).forEach(([nodeId, data]) => {
      const dx = data.x - x;
      const dy = data.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        clickedNode = nodeId;
      }
    });
    if (clickedNode) {
      handleNodeClick(clickedNode, event);
    } else {
      const newNodeId = String.fromCharCode(65 + Object.keys(graph).length);
      setGraph(prev => ({
        ...prev,
        [newNodeId]: { x, y, neighbors: [] }
      }));
    }
  };

  const addNode = () => {
    if (!newNodeId || graph[newNodeId]) return;
    
    setGraph(prev => ({
      ...prev,
      [newNodeId]: {
        x: Math.random() * 200 + 50,
        y: Math.random() * 200 + 50,
        neighbors: []
      }
    }));
    setNewNodeId('');
  };

  const removeNode = (nodeId) => {
    if (!editMode) return;
    
    const newGraph = { ...graph };
    // Remove edges pointing to this node
    Object.entries(newGraph).forEach(([id, data]) => {
      if (id !== nodeId) {
        data.neighbors = data.neighbors.filter(n => n !== nodeId);
      }
    });
    // Remove the node
    delete newGraph[nodeId];
    setGraph(newGraph);
    
    if (startNode === nodeId) setStartNode(Object.keys(newGraph)[0] || '');
    setGoalNodes(prev => {
      const newGoals = new Set(prev);
      newGoals.delete(nodeId);
      return newGoals;
    });
  };

  const toggleEdge = (node1, node2) => {
    if (!editMode) return;
    setGraph((prev) => {
      const newGraph = { ...prev };
      // Create new copies of the neighbor arrays
      const node1Neighbors = [...newGraph[node1].neighbors];
      const node2Neighbors = [...newGraph[node2].neighbors];

      if (node1Neighbors.includes(node2)) {
        // Remove the edge in both directions
        newGraph[node1] = {
          ...newGraph[node1],
          neighbors: node1Neighbors.filter((n) => n !== node2),
        };
        newGraph[node2] = {
          ...newGraph[node2],
          neighbors: node2Neighbors.filter((n) => n !== node1),
        };
      } else {
        // Add the edge in both directions
        newGraph[node1] = {
          ...newGraph[node1],
          neighbors: [...node1Neighbors, node2],
        };
        newGraph[node2] = {
          ...newGraph[node2],
          neighbors: [...node2Neighbors, node1],
        };
      }
      return newGraph;
    });
  };

  const toggleGoalNode = (nodeId) => {
    setGoalNodes(prev => {
      const newGoals = new Set(prev);
      if (newGoals.has(nodeId)) {
        newGoals.delete(nodeId);
      } else {
        newGoals.add(nodeId);
      }
      return newGoals;
    });
  };

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
    setOpen([startNode]);
    setVisited(new Set());
    setCurrent(null);
    setStepCount(0);
    setStatus('running');
    setIsRunning(false);
    setHistory([]);
    setNodeDepths({ [startNode]: 0 });
    if (algorithm === 'ids') {
      setCurrentDepthLimit(0);
    }
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
    setAutoRun(false);
  };

  const step = () => {
    saveState();

    if (open.length === 0) {
      if (algorithm === 'ids') {
        setCurrentDepthLimit(prev => prev + 1);
        setOpen([startNode]);
        setVisited(new Set());
        setCurrent(null);
        setNodeDepths({ [startNode]: 0 });
        return;
      }
      setStatus('failure');
      return;
    }

    const node = open[0];
    const currentDepth = nodeDepths[node] || 0;
    const newOpen = open.slice(1);
    setCurrent(node);
    setVisited(prev => new Set([...prev, node]));

    if (goalNodes.has(node)) {
      setOpen(newOpen);
      setStatus('success');
      return;
    }

    let newNodes = [];
    if (algorithm !== 'dls' && algorithm !== 'ids' || currentDepth < (algorithm === 'ids' ? currentDepthLimit : depthLimit)) {
      newNodes = graph[node].neighbors.filter(n => !visited.has(n) && !open.includes(n));
      
      newNodes.forEach(n => {
        setNodeDepths(prev => ({
          ...prev,
          [n]: currentDepth + 1
        }));
      });
    }
    
    setOpen(algorithm === 'bfs' 
      ? [...newOpen, ...newNodes]  // BFS: Add to end
      : [...newNodes, ...newOpen]  // DFS/DLS/IDS: Add to front
    );
    
    setStepCount(prev => prev + 1);
  };

  const runAlgorithm = () => {
    if (status === 'running') {
      if (open.length === 0) {
        setStatus('failure');
        return;
      }

      saveState();
      step();
      
      if (status === 'running') {
        setTimeout(runAlgorithm, 100);
      }
    }
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
    
    // Define the drawGraph function before it's used.
    const drawGraph = () => {
      // Clear canvas.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw edges.
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
      // Draw nodes.
      Object.entries(graph).forEach(([node, data]) => {
        ctx.beginPath();
        ctx.arc(data.x, data.y, 15, 0, 2 * Math.PI);
        if (node === current) {
          ctx.fillStyle = '#ff0000';
        } else if (goalNodes.has(node) && visited.has(node)) {
          ctx.fillStyle = '#00ff00';
        } else if (goalNodes.has(node)) {
          ctx.fillStyle = '#90EE90';
        } else if (node === startNode) {
          ctx.fillStyle = '#ADD8E6';
        } else if (visited.has(node)) {
          ctx.fillStyle = '#ffcc00';
        } else if (open.includes(node)) {
          ctx.fillStyle = '#00ccff';
        } else if (node === connectingNode) {
          ctx.fillStyle = '#ff9999';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        
        // Draw node label.
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node, data.x, data.y - 6);
        
        // Draw node depth if available.
        if (nodeDepths[node] !== undefined) {
          ctx.font = '10px Arial';
          ctx.fillText(`d:${nodeDepths[node]}`, data.x, data.y + 6);
        }
      });
    };

    // If a node is in connection mode, add a mousemove listener to show a dynamic connection line.
    let handleMouseMove;
    if (connectingNode && graph[connectingNode]) {
      const mousePos = { x: 0, y: 0 };
      handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGraph();
        ctx.strokeStyle = '#ff0000';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(graph[connectingNode].x, graph[connectingNode].y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      canvas.addEventListener('mousemove', handleMouseMove);
    }
    
    // Perform the initial drawing.
    drawGraph();

    return () => {
      if (handleMouseMove) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isClient, graph, current, visited, open, goalNodes, startNode, nodeDepths, connectingNode]);

  useEffect(() => {
    if (autoRun && status === 'running') {
      const timer = setTimeout(() => {
        step();
      }, 100);
      
      return () => clearTimeout(timer);
    }
    if (status !== 'running' || open.length === 0) {
      setAutoRun(false);
    }
  }, [autoRun, status, open]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Graph Search Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isClient && (
            <>
              <div className="flex space-x-4 mb-4">
                <Button 
                  onClick={() => setEditMode(!editMode)}
                  className={editMode ? 'bg-green-500' : ''}
                >
                  {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
                </Button>
                {editMode && (
                  <>
                    <Input
                      value={newNodeId}
                      onChange={(e) => setNewNodeId(e.target.value.toUpperCase())}
                      placeholder="Node ID"
                      className="w-20"
                    />
                    <Button onClick={() => {
                      if (!newNodeId || graph[newNodeId]) return;
                      setGraph(prev => ({
                        ...prev,
                        [newNodeId]: {
                          x: Math.random() * 200 + 50,
                          y: Math.random() * 200 + 50,
                          neighbors: []
                        }
                      }));
                      setNewNodeId('');
                    }}>
                      Add Node
                    </Button>
                  </>
                )}
              </div>

              {editMode && (
                <div className="flex space-x-4 mb-4">
                  <Select value={startNode} onValueChange={(value) => setStartNode(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select start node" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(graph).map(node => (
                        <SelectItem key={node} value={node}>Node {node}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={Array.from(goalNodes)[0] || ''}
                    onValueChange={(value) => setGoalNodes(new Set([value]))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select goal node" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(graph).map(node => (
                        <SelectItem key={node} value={node}>Node {node}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                    <SelectItem value="ids">Iterative Deepening Search</SelectItem>
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
                <Button onClick={() => setAutoRun(true)} disabled={status !== 'running'}>
                  Start
                </Button>
                <Button onClick={resetSearch} disabled={status === 'not_started'}>
                  Reset
                </Button>
              </div>

              {algorithm === 'ids' && (
                <div className="mt-2">
                  <p><strong>Current Depth Limit:</strong> {currentDepthLimit}</p>
                </div>
              )}

              <div className="border rounded p-4">
                <canvas 
                  ref={canvasRef}
                  width="600" 
                  height="400" 
                  className="border cursor-pointer"
                  onClick={handleCanvasClick}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!editMode || hasDragged) return;
                    const canvas = canvasRef.current;
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    let clickedNode = null;
                    Object.entries(graph).forEach(([nodeId, data]) => {
                      const dx = data.x - x;
                      const dy = data.y - y;
                      if (Math.sqrt(dx * dx + dy * dy) < 15) {
                        clickedNode = nodeId;
                      }
                    });
                    if (clickedNode) {
                      toggleGoalNode(clickedNode);
                    }
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleNodeDrag}
                  onMouseUp={handleNodeDragEnd}
                  onMouseLeave={handleNodeDragEnd}
                />
              </div>

              <div className="space-y-2">
                <p><strong>Algorithm:</strong> {algorithm === 'bfs' ? 'Breadth-First Search' : algorithm === 'dfs' ? 'Depth-First Search' : algorithm === 'dls' ? 'Depth-Limited Search' : 'Iterative Deepening Search'}</p>
                <p><strong>Queue Type:</strong> {algorithm === 'bfs' ? 'FIFO (add to end)' : 'LIFO (add to front)'}</p>
                {algorithm === 'dls' && <p><strong>Depth Limit (K):</strong> {depthLimit}</p>}
                <p><strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}</p>
                <p><strong>Step Count:</strong> {stepCount}</p>
                <p><strong>Current Node:</strong> {current || 'None'}</p>
                <p><strong>Open Queue:</strong> [{open.join(', ')}]</p>
                <p><strong>Visited Nodes:</strong> [{Array.from(visited).join(', ')}]</p>
              </div>

              {editMode && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    Instructions:
                    <ul className="list-disc pl-5">
                      <li>Click empty space to add a new node</li>
                      <li>Click one node then another to connect them</li>
                      <li>Right-click a node to set/unset as goal</li>
                      <li>Double-click a node to set as start</li>
                    </ul>
                  </div>
                </div>
              )}
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
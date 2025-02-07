"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const GraphSearchVisualization = () => {
  // ---------------------------
  // Graph & UI states (unchanged)
  // ---------------------------
  const [graph, setGraph] = useState({
    A: { x: 50, y: 50, neighbors: ['B', 'C'], costs: { B: 1, C: 1 } },
    B: { x: 150, y: 50, neighbors: ['A', 'D', 'E'], costs: { A: 1, D: 1, E: 1 } },
    C: { x: 50, y: 150, neighbors: ['A', 'F'], costs: { A: 1, F: 1 } },
    D: { x: 150, y: 150, neighbors: ['B', 'F'], costs: { B: 1, F: 1 } },
    E: { x: 250, y: 50, neighbors: ['B', 'G'], costs: { B: 1, G: 1 } },
    F: { x: 150, y: 250, neighbors: ['C', 'D', 'G'], costs: { C: 1, D: 1, G: 1 } },
    G: { x: 250, y: 150, neighbors: ['E', 'F'], costs: { E: 1, F: 1 } }
  });
  const [startNode, setStartNode] = useState('A');
  const [goalNodes, setGoalNodes] = useState(new Set(['G']));
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [newNodeId, setNewNodeId] = useState('');
  const [connectingNode, setConnectingNode] = useState(null);
  const [nodeToDelete, setNodeToDelete] = useState('');

  const [algorithm, setAlgorithm] = useState('bfs');
  const [open, setOpen] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [status, setStatus] = useState('not_started');
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
  const [pathCosts, setPathCosts] = useState({});

  // ---------------------------
  // Existing Greedy DFS states (using a full search tree)
  // ---------------------------
  const [treeRoot, setTreeRoot] = useState(null);
  const [dfsStack, setDfsStack] = useState([]);
  const nextIdRef = useRef(1);
  const searchTreeCanvasRef = useRef(null);

  // ---------------------------
  // New: Hill Climbing States and References
  // ---------------------------
  const [hillClimbingCurrent, setHillClimbingCurrent] = useState(null);
  const [hillClimbingHistory, setHillClimbingHistory] = useState([]);
  const hillClimbingCanvasRef = useRef(null);
  // We'll use a ref to store the current point synchronously.
  const currentPointRef = useRef(null);

  // Global best tracking across all runs.
  const [globalBestX, setGlobalBestX] = useState(null);
  const [globalBestValue, setGlobalBestValue] = useState(-Infinity);

  // ---------------------------
  // States for "Bing Hill Restart Random" auto-run mode
  // ---------------------------
  const [isBingRunning, setIsBingRunning] = useState(false);
  const [bingIterationCount, setBingIterationCount] = useState(0);
  const maxBingIterations = 10; // Adjust the total number of iterations as desired
  // Use a ref to synchronously keep track of iterations.
  const bingIterationRef = useRef(0);
  // A ref to hold the latest isBingRunning value.
  const isBingRunningRef = useRef(isBingRunning);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    isBingRunningRef.current = isBingRunning;
  }, [isBingRunning]);

  // ---------------------------
  // Heuristic helper for PHS.
  // Computes a simple Euclidean distance from the given node to the nearest goal.
  // ---------------------------
  const heuristic = (node) => {
    if (!graph[node]) return 0;
    if (goalNodes.size === 0) return 0;
    let minDist = Infinity;
    goalNodes.forEach((goal) => {
      if (graph[goal]) {
        const dx = graph[node].x - graph[goal].x;
        const dy = graph[node].y - graph[goal].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
        }
      }
    });
    return minDist;
  };

  // ---------------------------
  // Event Handlers (graph editing and canvas events remain mostly unchanged)
  // ---------------------------
  const handleNodeConnection = (nodeId) => {
    if (!editMode) return;
    if (!connectingNode) {
      setConnectingNode(nodeId);
    } else if (connectingNode !== nodeId) {
      toggleEdge(connectingNode, nodeId);
      setConnectingNode(null);
    } else {
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
    Object.entries(graph).forEach(([node, data]) => {
      const dx = data.x - x;
      const dy = data.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        clickedNode = node;
      }
    });
    if (clickedNode) {
      handleNodeClick(clickedNode, event);
      return;
    }

    let clickedEdge = null;
    Object.entries(graph).forEach(([node, data]) => {
      data.neighbors.forEach(neighbor => {
        if (node < neighbor) {
          const neighborData = graph[neighbor];
          const midX = (data.x + neighborData.x) / 2;
          const midY = (data.y + neighborData.y) / 2;
          const dx = midX - x;
          const dy = midY - y;
          if (Math.sqrt(dx * dx + dy * dy) < 10) {
            clickedEdge = { node1: node, node2: neighbor };
          }
        }
      });
    });

    if (clickedEdge) {
      const currentCost = graph[clickedEdge.node1].costs
        ? graph[clickedEdge.node1].costs[clickedEdge.node2] || 1
        : 1;
      const newCostStr = window.prompt(
        `Enter new cost for edge ${clickedEdge.node1}-${clickedEdge.node2}:`,
        currentCost
      );
      if (newCostStr !== null) {
        const newCost = parseFloat(newCostStr);
        if (!isNaN(newCost)) {
          setGraph(prev => {
            const updated = { ...prev };
            updated[clickedEdge.node1] = {
              ...updated[clickedEdge.node1],
              costs: { ...updated[clickedEdge.node1].costs, [clickedEdge.node2]: newCost }
            };
            updated[clickedEdge.node2] = {
              ...updated[clickedEdge.node2],
              costs: { ...updated[clickedEdge.node2].costs, [clickedEdge.node1]: newCost }
            };
            return updated;
          });
        }
      }
      return;
    }

    const newNodeGeneratedId = String.fromCharCode(65 + Object.keys(graph).length);
    setGraph(prev => ({
      ...prev,
      [newNodeGeneratedId]: { x, y, neighbors: [], costs: {} }
    }));
  };

  const addNode = () => {
    if (!newNodeId || graph[newNodeId]) return;
    setGraph(prev => ({
      ...prev,
      [newNodeId]: {
        x: Math.random() * 200 + 50,
        y: Math.random() * 200 + 50,
        neighbors: [],
        costs: {}
      }
    }));
    setNewNodeId('');
  };

  const removeNode = (nodeId) => {
    if (!editMode) return;
    const newGraph = { ...graph };
    Object.entries(newGraph).forEach(([id, data]) => {
      if (id !== nodeId) {
        data.neighbors = data.neighbors.filter(n => n !== nodeId);
        if (data.costs) {
          delete data.costs[nodeId];
        }
      }
    });
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
      const node1Neighbors = [...newGraph[node1].neighbors];
      const node2Neighbors = [...newGraph[node2].neighbors];
      if (node1Neighbors.includes(node2)) {
        newGraph[node1] = {
          ...newGraph[node1],
          neighbors: node1Neighbors.filter((n) => n !== node2),
          costs: { ...newGraph[node1].costs }
        };
        delete newGraph[node1].costs[node2];
        newGraph[node2] = {
          ...newGraph[node2],
          neighbors: node2Neighbors.filter((n) => n !== node1),
          costs: { ...newGraph[node2].costs }
        };
        delete newGraph[node2].costs[node1];
      } else {
        const cost = 1;
        newGraph[node1] = {
          ...newGraph[node1],
          neighbors: [...node1Neighbors, node2],
          costs: { ...newGraph[node1].costs, [node2]: cost }
        };
        newGraph[node2] = {
          ...newGraph[node2],
          neighbors: [...node2Neighbors, node1],
          costs: { ...newGraph[node2].costs, [node1]: cost }
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
      nodeDepths: { ...nodeDepths },
      pathCosts: { ...pathCosts }
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
      setPathCosts(previousState.pathCosts);
      setHistory(prev => prev.slice(0, -1));
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
    setPathCosts({});
    setAutoRun(false);
    // Clear greedy DFS search tree states as well.
    setTreeRoot(null);
    setDfsStack([]);
  };

  // ---------------------------
  // New: Initialize Search Function
  // ---------------------------
  // This function resets the search state (via resetSearch) and then initializes the
  // appropriate search parameters based on the selected algorithm.
  const initializeSearch = () => {
    resetSearch(); // Assuming resetSearch clears open, visited, etc.
    if (algorithm === 'greedy-dfs') {
      // Initialize full search tree for Greedy DFS
      const root = {
        id: nextIdRef.current++,
        state: startNode,
        cost: 0,
        parent: null,
        children: []
      };
      setTreeRoot(root);
      setDfsStack([root]);
      setStatus('running');
      setStepCount(0);
    } else if (
      algorithm === 'phs' ||
      algorithm === 'ucs' ||
      algorithm === 'bfs' ||
      algorithm === 'dfs' ||
      algorithm === 'dls' ||
      algorithm === 'ids'
    ) {
      setOpen([startNode]);
      setPathCosts({ [startNode]: 0 });
      setNodeDepths({ [startNode]: 0 });
      if (algorithm === 'ids') {
        setCurrentDepthLimit(0);
      }
      setStatus('running');
      setStepCount(0);
      setVisited(new Set());
    } else if (algorithm === 'a-star') {
      // For A*: g(start) = 0 and the open list starts with the start node
      const newPathCosts = { [startNode]: 0 };
      const newOpen = [startNode];
      setPathCosts(newPathCosts);
      setOpen(newOpen);
      setStatus('running');
      console.log("A* initialized:", newPathCosts, newOpen);
    } else {
      // Other algorithms: initialization as needed.
      setOpen([startNode]);
      setStatus('running');
    }
  };

  // ---------------------------
  // Search Step Function
  // ---------------------------
  const step = () => {
    saveState();

    if (algorithm === 'greedy-dfs') {
      // Greedy DFS uses the full search tree.
      if (dfsStack.length === 0) {
        setStatus('failure');
        return;
      }
      const currentNode = dfsStack[dfsStack.length - 1];
      setCurrent(currentNode.state);
      if (goalNodes.has(currentNode.state)) {
        setStatus('success');
        return;
      }
      // Build branch to prevent cycles.
      let branch = [];
      let temp = currentNode;
      while (temp) {
        branch.push(temp.state);
        temp = temp.parent;
      }
      let candidateList = [];
      graph[currentNode.state].neighbors.forEach(neighbor => {
        if (!branch.includes(neighbor)) {
          const edgeCost = graph[currentNode.state].costs[neighbor] || 1;
          candidateList.push({
            id: nextIdRef.current,
            state: neighbor,
            cost: currentNode.cost + edgeCost,
            parent: currentNode,
            children: []
          });
          nextIdRef.current++;
        }
      });
      if (candidateList.length > 0) {
        candidateList.sort((a, b) => a.cost - b.cost);
        currentNode.children = currentNode.children.concat(candidateList);
        const newStack = dfsStack.slice(0, dfsStack.length - 1);
        candidateList.slice().reverse().forEach(node => newStack.push(node));
        setDfsStack(newStack);
        setStepCount(prev => prev + 1);
      } else {
        const newStack = dfsStack.slice(0, dfsStack.length - 1);
        setDfsStack(newStack);
        setStepCount(prev => prev + 1);
      }
      return;
    }

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

    let node;
    let newOpen;
    // Branch based on the algorithm for selecting the next node.
    if (algorithm === 'ucs') {
      node = open.reduce((min, current) =>
        (pathCosts[current] < pathCosts[min] ? current : min), open[0]);
      newOpen = open.filter(n => n !== node);
    } else if (algorithm === 'phs') {
      node = open.reduce((prev, curr) => {
        return heuristic(curr) < heuristic(prev) ? curr : prev;
      }, open[0]);
      newOpen = open.filter(n => n !== node);
    } else if (algorithm === 'a-star') {
      // A*: select node with lowest f(n) = g(n) + h(n)
      if (open.length === 0) {
        setStatus("failed");
        return;
      }
      node = open.reduce((prev, curr) => {
        const fPrev = (pathCosts[prev] || 0) + heuristic(prev);
        const fCurr = (pathCosts[curr] || 0) + heuristic(curr);
        return fCurr < fPrev ? curr : prev;
      }, open[0]);
      newOpen = open.filter((n) => n !== node);
    } else {
      node = open[0];
      newOpen = open.slice(1);
    }

    setCurrent(node);
    setVisited(prev => new Set([...prev, node]));
    if (goalNodes.has(node)) {
      setOpen(newOpen);
      setStatus('success');
      return;
    }

    let newNodes = [];
    const currentDepth = nodeDepths[node] || 0;
    if ((algorithm !== 'dls' && algorithm !== 'ids') || currentDepth < (algorithm === 'ids' ? currentDepthLimit : depthLimit)) {
      newNodes = graph[node].neighbors.filter(n => !visited.has(n) && !open.includes(n));
      newNodes.forEach(n => {
        setNodeDepths(prev => ({ ...prev, [n]: currentDepth + 1 }));
        if (algorithm === 'ucs' || algorithm === 'phs' || algorithm === 'a-star') {
          const newCost = (pathCosts[node] || 0) + (graph[node].costs[n] || 1);
          setPathCosts(prev => ({ ...prev, [n]: newCost }));
        }
      });
    }

    setOpen(
      algorithm === 'bfs'
        ? [...newOpen, ...newNodes]
        : algorithm === 'ucs'
        ? [...newOpen, ...newNodes].sort((a, b) => pathCosts[a] - pathCosts[b])
        : algorithm === 'phs'
        ? [...newOpen, ...newNodes].sort((a, b) => heuristic(a) - heuristic(b))
        : algorithm === 'a-star'
        ? [...newOpen, ...newNodes].sort((a, b) => (pathCosts[a] + heuristic(a)) - (pathCosts[b] + heuristic(b)))
        : [...newNodes, ...newOpen]
    );

    setStepCount(prev => prev + 1);
  };

  // ---------------------------
  // Drawing the Graph and Search Tree
  // ---------------------------
  const saveGraphToFile = () => {
    const dataStr = JSON.stringify(graph, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'graph.json';
    let link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadGraphFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedGraph = JSON.parse(e.target.result);
        setGraph(parsedGraph);
        const firstNode = Object.keys(parsedGraph)[0] || '';
        setStartNode(firstNode);
        setGoalNodes(new Set());
      } catch (error) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!isClient) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const drawGraph = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      Object.entries(graph).forEach(([node, data]) => {
        data.neighbors.forEach(neighbor => {
          if (node < neighbor) {
            const neighborData = graph[neighbor];
            const midX = (data.x + neighborData.x) / 2;
            const midY = (data.y + neighborData.y) / 2;
            const cost = data.costs && data.costs[neighbor] !== undefined ? data.costs[neighbor] : 1;
            ctx.fillStyle = 'blue';
            ctx.font = '12px Arial';
            ctx.fillText(cost, midX, midY);
          }
        });
      });
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
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node, data.x, data.y - 6);
        if (nodeDepths[node] !== undefined) {
          ctx.font = '10px Arial';
          ctx.fillText(`d:${nodeDepths[node]}`, data.x, data.y + 6);
        }
      });
    };

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
    drawGraph();
    return () => {
      if (handleMouseMove) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isClient, graph, current, visited, open, goalNodes, startNode, nodeDepths, connectingNode, pathCosts]);

  useEffect(() => {
    if (!isClient || algorithm !== 'greedy-dfs' || !treeRoot) return;
    const canvas = searchTreeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const levels = {};
    const traverse = (node, depth) => {
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(node);
      node.children.forEach(child => traverse(child, depth + 1));
    };
    traverse(treeRoot, 0);
    const verticalSpacing = 80;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const nodePositions = {};
    Object.keys(levels).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesAtLevel = levels[level];
      const horizontalSpacing = canvas.width / (nodesAtLevel.length + 1);
      nodesAtLevel.forEach((node, idx) => {
        nodePositions[node.id] = {
          x: (idx + 1) * horizontalSpacing,
          y: 50 + level * verticalSpacing
        };
      });
    });
    const drawEdges = (node) => {
      if (node.parent) {
        const parentPos = nodePositions[node.parent.id];
        const nodePos = nodePositions[node.id];
        if (parentPos && nodePos) {
          ctx.beginPath();
          ctx.moveTo(parentPos.x, parentPos.y);
          ctx.lineTo(nodePos.x, nodePos.y);
          ctx.stroke();
        }
      }
      node.children.forEach(child => drawEdges(child));
    };
    drawEdges(treeRoot);
    const drawNodes = (node) => {
      const pos = nodePositions[node.id];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
      if (dfsStack.length > 0 && dfsStack[dfsStack.length - 1].id === node.id) {
        ctx.fillStyle = '#ff0000';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${node.state} (${node.cost})`, pos.x, pos.y);
      node.children.forEach(child => drawNodes(child));
    };
    drawNodes(treeRoot);
  }, [isClient, treeRoot, dfsStack, algorithm]);

  useEffect(() => {
    if (autoRun && status === 'running') {
      const timer = setTimeout(() => {
        step();
      }, 100);
      return () => clearTimeout(timer);
    }
    if (status !== 'running' || (algorithm !== 'greedy-dfs' && open.length === 0)) {
      setAutoRun(false);
    }
  }, [autoRun, status, open, algorithm, dfsStack]);

  // ---------------------------
  // Hill Climbing Helper Function for an interesting function graph.
  // f(x) = 50*sin((π/75)*x) + 50*cos((π/50)*x) + 100
  // This produces multiple local extrema.
  // ---------------------------
  const f = (x) => {
    return 50 * Math.sin((x * Math.PI) / 75) + 50 * Math.cos((x * Math.PI) / 50) + 100;
  };

  // ---------------------------
  // Hill Climbing Event Handlers and Algorithm Logic
  // ---------------------------
  // (1) Set a starting point by clicking on the canvas.
  const handleHillClimbingCanvasClick = (e) => {
    const canvas = hillClimbingCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      currentPointRef.current = x;
      setHillClimbingCurrent(x);
      setHillClimbingHistory([x]);
    }
  };

  // (2) Run one hill climbing step by checking left and right neighbors.
  const runHillClimbingStep = () => {
    if (hillClimbingCurrent === null) return;
    const stepSize = 5; // adjust as needed
    const currentVal = f(hillClimbingCurrent);
    let bestNeighbor = hillClimbingCurrent;
    let bestVal = currentVal;

    // Check left neighbor.
    if (hillClimbingCurrent - stepSize >= 0) {
      const left = hillClimbingCurrent - stepSize;
      const leftVal = f(left);
      if (leftVal > bestVal) {
        bestVal = leftVal;
        bestNeighbor = left;
      }
    }
    // Check right neighbor.
    if (hillClimbingCurrent + stepSize <= 600) {
      const right = hillClimbingCurrent + stepSize;
      const rightVal = f(right);
      if (rightVal > bestVal) {
        bestVal = rightVal;
        bestNeighbor = right;
      }
    }

    // If no better neighbor exists, we've reached a local maximum.
    if (bestNeighbor === hillClimbingCurrent) {
      const localMax = f(hillClimbingCurrent);
      if (localMax > globalBestValue) {
        setGlobalBestValue(localMax);
        setGlobalBestX(hillClimbingCurrent);
      }
      // For manual mode, just return (or you could alert if desired)
      return;
    } else {
      currentPointRef.current = bestNeighbor;
      setHillClimbingCurrent(bestNeighbor);
      setHillClimbingHistory((prev) => [...prev, bestNeighbor]);
    }
  };

  // (3) Reset the hill climbing state.
  const resetHillClimbing = () => {
    currentPointRef.current = null;
    setHillClimbingCurrent(null);
    setHillClimbingHistory([]);
  };

  // (4) Random Restart Hill Climbing: choose a random starting point.
  const randomRestartHillClimbing = () => {
    const randomStart = Math.random() * 600;
    currentPointRef.current = randomStart;
    setHillClimbingCurrent(randomStart);
    setHillClimbingHistory([randomStart]);
  };

  // ---------------------------
  // Bing Hill Restart Random: Auto-run version of hill climbing.
  // When a local maximum is reached, it automatically restarts until
  // maxBingIterations is reached.
  // ---------------------------
  const bingHillClimbStep = () => {
    // Use ref to check the most up-to-date value.
    if (!isBingRunningRef.current) return;

    // If no starting point exists, initialize one.
    let current = currentPointRef.current;
    if (current === null) {
      randomRestartHillClimbing();
      setTimeout(bingHillClimbStep, 300);
      return;
    }

    const stepSize = 5;
    const currentVal = f(current);
    let bestNeighbor = current;
    let bestVal = currentVal;

    // Check left neighbor.
    if (current - stepSize >= 0) {
      const left = current - stepSize;
      const leftVal = f(left);
      if (leftVal > bestVal) {
        bestVal = leftVal;
        bestNeighbor = left;
      }
    }
    // Check right neighbor.
    if (current + stepSize <= 600) {
      const right = current + stepSize;
      const rightVal = f(right);
      if (rightVal > bestVal) {
        bestVal = rightVal;
        bestNeighbor = right;
      }
    }

    // If no better neighbor, we've reached a local maximum.
    if (bestNeighbor === current) {
      // Local maximum reached.
      const localMax = f(current);
      if (localMax > globalBestValue) {
        setGlobalBestValue(localMax);
        setGlobalBestX(current);
      }
      // Increase the iteration count.
      bingIterationRef.current += 1;
      setBingIterationCount(bingIterationRef.current);
      console.log(
        `Iteration ${bingIterationRef.current}: local maximum at x = ${Math.round(
          current
        )}, f(x) = ${localMax.toFixed(1)}`
      );

      // If maximum iterations haven't been reached, restart and continue.
      if (bingIterationRef.current < maxBingIterations) {
        randomRestartHillClimbing();
        setTimeout(bingHillClimbStep, 300);
      } else {
        setIsBingRunning(false);
        console.log("Bing Hill Restart Random completed.");
      }
      return;
    } else {
      // Continue hill climbing.
      currentPointRef.current = bestNeighbor;
      setHillClimbingCurrent(bestNeighbor);
      setHillClimbingHistory((prev) => [...prev, bestNeighbor]);
      setTimeout(bingHillClimbStep, 300);
    }
  };

  // Start the auto-run Bing Hill Restart Random mode.
  const runBingHillRestartRandom = () => {
    bingIterationRef.current = 0; // Reset the ref counter.
    setBingIterationCount(0);
    resetHillClimbing();
    randomRestartHillClimbing();
    setIsBingRunning(true);
    // Start the loop after a short delay.
    setTimeout(bingHillClimbStep, 300);
  };

  // Stop the auto-run.
  const stopBingHillRestartRandom = () => {
    setIsBingRunning(false);
  };

  // ---------------------------
  // Draw the Hill Climbing Function Graph
  // ---------------------------
  useEffect(() => {
    const canvas = hillClimbingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the x-axis.
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.stroke();

    // Draw the function curve.
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x++) {
      const y = canvas.height - f(x); // invert y-axis
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = "blue";
    ctx.stroke();

    // Draw the hill climbing path.
    if (hillClimbingHistory.length > 0) {
      ctx.beginPath();
      hillClimbingHistory.forEach((x, idx) => {
        const y = canvas.height - f(x);
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Highlight the current point.
    if (hillClimbingCurrent !== null) {
      const y = canvas.height - f(hillClimbingCurrent);
      ctx.beginPath();
      ctx.arc(hillClimbingCurrent, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "green";
      ctx.fill();
    }
  }, [hillClimbingCurrent, hillClimbingHistory]);

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
                <Button onClick={saveGraphToFile}>
                  Save Graph
                </Button>
                <Button onClick={() => document.getElementById('load-graph-input').click()}>
                  Load Graph
                </Button>
                <input 
                  type="file" 
                  id="load-graph-input" 
                  onChange={loadGraphFromFile} 
                  style={{ display: 'none' }} 
                />
                {editMode && (
                  <>
                    <Input
                      value={newNodeId}
                      onChange={(e) => setNewNodeId(e.target.value.toUpperCase())}
                      placeholder="Node ID"
                      className="w-20"
                    />
                    <Button onClick={addNode}>
                      Add Node
                    </Button>
                  </>
                )}
              </div>

              {editMode && (
                <div className="flex space-x-4 mb-4">
                  <Input
                    value={nodeToDelete}
                    onChange={(e) => setNodeToDelete(e.target.value.toUpperCase())}
                    placeholder="Node ID to Delete"
                    className="w-20"
                  />
                  <Button onClick={() => { removeNode(nodeToDelete); setNodeToDelete(''); }}>
                    Delete Node
                  </Button>
                </div>
              )}

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
                    <SelectItem value="ucs">Uniform Cost Search</SelectItem>
                    <SelectItem value="greedy-dfs">Greedy DFS</SelectItem>
                    <SelectItem value="phs">PHS Algorithm (Greedy Best-First)</SelectItem>
                    <SelectItem value="a-star">A* Algorithm</SelectItem>
                    <SelectItem value="hill-climbing">Hill Climbing</SelectItem>
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

              {algorithm === 'greedy-dfs' && (
                <div className="mt-4 border rounded p-4">
                  <p><strong>Full Search Tree (Greedy DFS):</strong></p>
                  <canvas 
                    ref={searchTreeCanvasRef}
                    width="600" 
                    height="400" 
                    className="border"
                  />
                </div>
              )}

              {algorithm === 'hill-climbing' && (
                <div className="mt-4">
                  <h3 className="text-xl font-bold">Hill Climbing Visualization</h3>
                  <p>
                    Click on the graph to select a starting point and then use the controls below.
                  </p>
                  <canvas
                    ref={hillClimbingCanvasRef}
                    width="600"
                    height="300"
                    className="border mb-2"
                    onClick={handleHillClimbingCanvasClick}
                  />
                  <p>
                    {hillClimbingCurrent !== null ? (
                      <>Current Point: {Math.round(hillClimbingCurrent)} (f(x) = {f(hillClimbingCurrent).toFixed(1)})</>
                    ) : (
                      "No starting point selected."
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button onClick={runHillClimbingStep} disabled={hillClimbingCurrent === null || isBingRunning}>
                      Step Hill Climbing
                    </Button>
                    <Button onClick={resetHillClimbing}>
                      Reset Hill Climbing
                    </Button>
                    <Button onClick={randomRestartHillClimbing}>
                      Random Restart Hill Climbing
                    </Button>
                  </div>
                  <hr className="my-4" />
                  <h4 className="text-lg font-bold">Bing Hill Restart Random</h4>
                  <p>
                    This mode automatically performs iterative hill climbing. When a local maximum is reached, it will restart
                    until {maxBingIterations} iterations have been executed.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {!isBingRunning ? (
                      <Button onClick={runBingHillRestartRandom}>
                        Run Bing Hill Restart Random
                      </Button>
                    ) : (
                      <Button onClick={stopBingHillRestartRandom}>
                        Stop Bing Hill Restart Random
                      </Button>
                    )}
                  </div>
                  <p className="mt-2">
                    Bing Iterations: {bingIterationCount} / {maxBingIterations}
                  </p>
                  {globalBestX !== null && (
                    <p className="mt-2">
                      Global Best: x = {Math.round(globalBestX)}, f(x) = {globalBestValue.toFixed(1)}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p>
                  <strong>Algorithm:</strong>{" "}
                  {algorithm === 'bfs'
                    ? 'Breadth-First Search'
                    : algorithm === 'dfs'
                    ? 'Depth-First Search'
                    : algorithm === 'dls'
                    ? 'Depth-Limited Search'
                    : algorithm === 'ids'
                    ? 'Iterative Deepening Search'
                    : algorithm === 'ucs'
                    ? 'Uniform Cost Search'
                    : algorithm === 'greedy-dfs'
                    ? 'Greedy DFS'
                    : algorithm === 'phs'
                    ? 'PHS Algorithm (Greedy Best-First)'
                    : 'A* Algorithm'}
                </p>
                <p>
                  <strong>Queue Type:</strong>{" "}
                  {algorithm === 'bfs'
                    ? 'FIFO (add to end)'
                    : algorithm === 'dfs'
                    ? 'LIFO (add to front)'
                    : algorithm === 'dls'
                    ? 'Depth-Limited Search'
                    : algorithm === 'ucs'
                    ? 'Priority Queue (by cumulative cost)'
                    : algorithm === 'phs'
                    ? 'Priority Queue (by h(n))'
                    : algorithm === 'a-star'
                    ? 'Priority Queue (f(n)=g(n)+h(n))'
                    : 'Priority Queue / DFS Stack'}
                </p>
                {algorithm === 'dls' && <p><strong>Depth Limit (K):</strong> {depthLimit}</p>}
                <p><strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}</p>
                <p><strong>Step Count:</strong> {stepCount}</p>
                <p><strong>Current Node:</strong> {current || 'None'}</p>
                <p><strong>Open Queue:</strong> {algorithm === 'ucs' 
                  ? '[' + open.map(node => `${node} (${pathCosts[node] ?? 0})`).join(', ') + ']' 
                  : algorithm === 'phs'
                  ? '[' + open.map(node => `${node} (${heuristic(node).toFixed(1)})`).join(', ') + ']'
                  : algorithm === 'greedy-dfs'
                  ? (dfsStack.length > 0 ? '[' + dfsStack.map(n => n.state).join(', ') + ']' : '[]')
                  : algorithm === 'a-star'
                  ? '[' + open.map(n => `${n} (${((pathCosts[n] || 0) + heuristic(n)).toFixed(1)})`).join(', ') + ']'
                  : '[' + open.join(', ') + ']'}
                </p>
                <p><strong>Visited Nodes:</strong> [{algorithm === 'greedy-dfs'
                  ? '' 
                  : Array.from(visited).join(', ')}]
                </p>
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
                      <li>Click near an edge's midpoint to edit its cost</li>
                      <li>Use the "Delete Node" option to remove a node</li>
                      {algorithm === 'greedy-dfs' && <li>
                        In Greedy DFS a full search tree is built (all available paths from a node are added with their cumulative cost) and
                        at each expansion the child with the lowest cost is chosen.
                      </li>}
                      {algorithm === 'phs' && <li>
                        PHS (informed search) uses only the heuristic function h(n), which is based on the Euclidean distance between a node and the closest goal. The node with the lowest h(n) is chosen at each step.
                      </li>}
                      {algorithm === 'a-star' && <li>
                        A* Algorithm uses f(n)=g(n)+h(n), where g(n) is the cumulative cost from the start and h(n) is the Euclidean distance heuristic.
                      </li>}
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

export default dynamic(() => Promise.resolve(GraphSearchVisualization), {
  ssr: false
});
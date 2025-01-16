'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Node {
  id: number;
  x: number;
  y: number;
  connections: number[];
}

export default function SubwayPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [path, setPath] = useState<number[]>([]);

  // 노드 생성 및 연결
  useEffect(() => {
    const createNodes = () => {
      const newNodes: Node[] = [];
      // 20개의 랜덤 노드 생성
      for (let i = 0; i < 20; i++) {
        newNodes.push({
          id: i,
          x: Math.random() * 400 + 50, // 50~450
          y: Math.random() * 400 + 50, // 50~450
          connections: []
        });
      }

      // 각 노드마다 가까운 2~4개의 노드와 연결
      newNodes.forEach((node, i) => {
        const distances = newNodes
          .map((other, j) => ({
            id: j,
            distance: Math.sqrt(
              Math.pow(other.x - node.x, 2) + Math.pow(other.y - node.y, 2)
            )
          }))
          .filter(d => d.id !== i)
          .sort((a, b) => a.distance - b.distance);

        const connectionCount = Math.floor(Math.random() * 3) + 2; // 2~4개
        const connections = distances
          .slice(0, connectionCount)
          .map(d => d.id);
        
        node.connections = connections;
        connections.forEach(connId => {
          if (!newNodes[connId].connections.includes(i)) {
            newNodes[connId].connections.push(i);
          }
        });
      });

      setNodes(newNodes);
    };

    createNodes();
  }, []);

  // 다익스트라 알고리즘
  const findShortestPath = (start: number, end: number) => {
    const distances = new Array(nodes.length).fill(Infinity);
    const previous = new Array(nodes.length).fill(-1);
    const visited = new Set<number>();
    
    distances[start] = 0;

    while (visited.size < nodes.length) {
      let minDistance = Infinity;
      let current = -1;

      // 방문하지 않은 노드 중 최소 거리를 가진 노드 찾기
      distances.forEach((distance, node) => {
        if (!visited.has(node) && distance < minDistance) {
          minDistance = distance;
          current = node;
        }
      });

      if (current === -1 || current === end) break;

      visited.add(current);

      // 인접 노드들의 거리 업데이트
      nodes[current].connections.forEach(neighbor => {
        if (visited.has(neighbor)) return;

        const distance = distances[current] + Math.sqrt(
          Math.pow(nodes[neighbor].x - nodes[current].x, 2) +
          Math.pow(nodes[neighbor].y - nodes[current].y, 2)
        );

        if (distance < distances[neighbor]) {
          distances[neighbor] = distance;
          previous[neighbor] = current;
        }
      });
    }

    // 경로 재구성
    const path: number[] = [];
    let current = end;
    while (current !== -1) {
      path.unshift(current);
      current = previous[current];
    }

    return path;
  };

  // 캔버스 그리기
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 500, 500);

    // 연결선 그리기
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 1;
    nodes.forEach(node => {
      node.connections.forEach(connId => {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(nodes[connId].x, nodes[connId].y);
        ctx.stroke();
      });
    });

    // 최단 경로 그리기
    if (path.length > 1) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      for (let i = 0; i < path.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[path[i]].x, nodes[path[i]].y);
        ctx.lineTo(nodes[path[i + 1]].x, nodes[path[i + 1]].y);
        ctx.stroke();
      }
    }

    // 노드 그리기
    nodes.forEach((node, i) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
      
      if (selectedNodes.includes(i)) {
        ctx.fillStyle = selectedNodes[0] === i ? 'blue' : 'green';
      } else {
        ctx.fillStyle = 'black';
      }
      
      ctx.fill();
      
      // 노드 번호 표시
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '10px Arial';
      ctx.fillText(i.toString(), node.x, node.y);
    });
  }, [nodes, selectedNodes, path]);

  // 노드 클릭 처리
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 클릭한 위치와 가장 가까운 노드 찾기
    const clickedNode = nodes.findIndex(node => 
      Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)) < 10
    );

    if (clickedNode !== -1) {
      if (selectedNodes.length === 2) {
        setSelectedNodes([clickedNode]);
      } else if (selectedNodes.length === 1 && clickedNode !== selectedNodes[0]) {
        setSelectedNodes([...selectedNodes, clickedNode]);
        // 최단 경로 계산
        const newPath = findShortestPath(selectedNodes[0], clickedNode);
        setPath(newPath);
      } else if (!selectedNodes.includes(clickedNode)) {
        setSelectedNodes([clickedNode]);
        setPath([]);
      }
    }
  };

  return (
    <div className="min-h-screen p-4">
      <button 
        onClick={() => router.back()}
        className="mb-4 bg-gray-800 text-white px-4 py-2 rounded-lg"
      >
        뒤로가기
      </button>
      
      <div className="text-center">
        <h1 className="text-2xl mb-4">지하철 정보</h1>
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            onClick={handleCanvasClick}
            style={{
              border: '1px solid white',
              cursor: 'pointer'
            }}
          />
        </div>
        <div className="mt-4 text-white">
          {selectedNodes.length === 0 && "출발역을 선택하세요"}
          {selectedNodes.length === 1 && "도착역을 선택하세요"}
          {selectedNodes.length === 2 && `${selectedNodes[0]}번 역에서 ${selectedNodes[1]}번 역까지의 최단 경로: ${path.join(' → ')}`}
        </div>
      </div>
    </div>
  );
} 
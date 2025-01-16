'use client';

import Image from "next/image";
import Webcam from "react-webcam";
import { useState, useRef, useCallback, useEffect } from "react";
import { loadOpenCv } from '../public/face-detection';
import Link from "next/link";

// 특징점 클래스 추가
interface Point {
  x: number;
  y: number;
  type: string; // 'eye', 'nose', 'mouth' 등
}

// 다익스트라 알고리즘 구현
function dijkstra(points: Point[]): [Point, Point][] {
  if (points.length < 2) return [];

  // 모든 점 쌍 간의 거리 계산
  const distances = new Map<string, number>();
  const edges: [Point, Point][] = [];

  // 모든 점들 사이의 거리 계산
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      distances.set(`${i}-${j}`, dist);
      edges.push([p1, p2]);
    }
  }

  // 최소 신장 트리 찾기 (Kruskal's algorithm으로 단순화)
  const sortedEdges = edges.sort((a, b) => {
    const distA = distances.get(`${points.indexOf(a[0])}-${points.indexOf(a[1])}`) || Infinity;
    const distB = distances.get(`${points.indexOf(b[0])}-${points.indexOf(b[1])}`) || Infinity;
    return distA - distB;
  });

  // 최소한의 엣지만 선택
  const selectedEdges: [Point, Point][] = [];
  const connected = new Set<Point>();

  for (const [p1, p2] of sortedEdges) {
    if (connected.size === points.length) break;
    if (!connected.has(p1) || !connected.has(p2)) {
      selectedEdges.push([p1, p2]);
      connected.add(p1);
      connected.add(p2);
    }
  }

  return selectedEdges;
}

export default function Home() {
  return (
    <div className="flex gap-4 items-center justify-center min-h-screen">
      <Link href="/camera">
        <button className="bg-black text-white px-6 py-2 rounded-lg">
          카메라
        </button>
      </Link>
      <Link href="/subway">
        <button className="bg-black text-white px-6 py-2 rounded-lg">
          지하철
        </button>
      </Link>
    </div>
  )
}
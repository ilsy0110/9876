'use client';
import Link from 'next/link';

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


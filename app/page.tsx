'use client';

import Image from "next/image";
import Webcam from "react-webcam";
import { useState, useRef, useCallback, useEffect } from "react";
import { loadOpenCv } from '../../public/face-detection';

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
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpenCvLoaded, setIsOpenCvLoaded] = useState(false);

  useEffect(() => {
    loadOpenCv(() => {
      console.log('OpenCV.js 로드 완료');
      setIsOpenCvLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isOpenCvLoaded || !cv) return;

    console.log('얼굴 검출 시작');
    const videoElement = webcamRef.current?.video;
    const canvas = canvasRef.current;
    if (!videoElement || !canvas) return;

    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    let animationFrameId: number;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isClassifierLoaded = false;
    let eyeClassifier: any = null;
    let noseClassifier: any = null;
    let mouthClassifier: any = null;

    // 분류기 초기화 함수
  // OpenCV.js가 로드된 후에 실행되어야 합니다.
const initClassifiers = async () => {
  try {
    // CascadeClassifier 인스턴스 생성
    eyeClassifier = new cv.CascadeClassifier();
    noseClassifier = new cv.CascadeClassifier();
    mouthClassifier = new cv.CascadeClassifier();

    // XML 파일을 비동기로 로드하는 함수
    const loadClassifierFile = async (path, filename) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      console.log("@@@@@******", response)
      const data = await response.text(); // XML은 텍스트 형식
      // OpenCV.js의 가상 파일 시스템에 파일 생성
      cv.FS_createDataFile('/', filename, data, true, false, false);
      return `/${filename}`;
    };

    // 각 분류기 파일을 로드하고 가상 파일 시스템에 저장
    const [eyePath, nosePath, mouthPath] = await Promise.all([
      loadClassifierFile('/haarcascade_eye.xml', 'haarcascade_eye.xml'),
      loadClassifierFile('/haarcascade_mcs_nose.xml', 'haarcascade_mcs_nose.xml'), 
      loadClassifierFile('/haarcascade_mcs_mouth.xml', 'haarcascade_mcs_mouth.xml')
    ]);

    // 가상 파일 시스템에서 분류기 로드
    const eyeResult = eyeClassifier.load(eyePath);
    const noseResult = noseClassifier.load(nosePath);
    const mouthResult = mouthClassifier.load(mouthPath);

    if (eyeResult && noseResult && mouthResult) {
      console.log('분류기 로드 성공');
      isClassifierLoaded = true;
    } else {
      throw new Error('분류기 로드 실패');
    }
  } catch (error) {
    console.error('분류기 초기화 오류:', error);
    return false;
  }
  return true;
};


    const detectFace = () => {
      if (!isClassifierLoaded) return;
      
      if (videoElement.readyState === 4) {
        try {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          const src = cv.imread(canvas);
          const gray = new cv.Mat();
          
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          
          try {
            // 특징점 저장을 위한 배열
            const featurePoints: Point[] = [];

            // 눈 검출
            const eyes = new cv.RectVector();
            eyeClassifier.detectMultiScale(gray, eyes, 1.1, 3, 0, new cv.Size(30, 30));
            
            // 코 검출
            const noses = new cv.RectVector();
            noseClassifier.detectMultiScale(gray, noses, 1.1, 3, 0, new cv.Size(30, 30));
            
            // 입 검출
            const mouths = new cv.RectVector();
            mouthClassifier.detectMultiScale(gray, mouths, 1.1, 3, 0, new cv.Size(30, 30));

            // 특징점 수집
            for (let i = 0; i < eyes.size(); ++i) {
              const eye = eyes.get(i);
              featurePoints.push({
                x: eye.x + eye.width/2,
                y: eye.y + eye.height/2,
                type: 'eye'
              });
            }

            for (let i = 0; i < noses.size(); ++i) {
              const nose = noses.get(i);
              featurePoints.push({
                x: nose.x + nose.width/2,
                y: nose.y + nose.height/2,
                type: 'nose'
              });
            }

            for (let i = 0; i < mouths.size(); ++i) {
              const mouth = mouths.get(i);
              featurePoints.push({
                x: mouth.x + mouth.width/2,
                y: mouth.y + mouth.height/2,
                type: 'mouth'
              });
            }

            // 다익스트라 알고리즘으로 최단 경로 계산
            const connections = dijkstra(featurePoints);

            // 특징점 그리기 (연두색 점)
            featurePoints.forEach(point => {
              cv.circle(
                src,
                new cv.Point(point.x, point.y),
                3, // 반지름
                [144, 238, 144, 255], // 연두색
                -1 // 채우기
              );
            });

            // 연결선 그리기 (연두색 선)
            connections.forEach(([p1, p2]) => {
              cv.line(
                src,
                new cv.Point(p1.x, p1.y),
                new cv.Point(p2.x, p2.y),
                [144, 238, 144, 255], // 연두색
                2 // 선 두께
              );
            });

            cv.imshow(canvas, src);

            // 메모리 해제
            eyes.delete();
            noses.delete();
            mouths.delete();

          } catch (error) {
            console.error('특징 검출 실패:', error);
          }

          src.delete();
          gray.delete();

        } catch (err) {
          console.error('OpenCV 처리 오류:', err);
        }
      }
      
      if (isClassifierLoaded) {
        animationFrameId = requestAnimationFrame(detectFace);
      }
    };

    // 분류기 초기화 후 detection 시작
      initClassifiers().then((success) => {
        if (success) {
          detectFace();
          // 분류기 초기화 성공 후 추가 로직
        }
      });
    

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (eyeClassifier) eyeClassifier.delete();
      if (noseClassifier) noseClassifier.delete();
      if (mouthClassifier) mouthClassifier.delete();
    };
  }, [isOpenCvLoaded]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <Image
        className="dark:invert"
        src="/next.svg"
        alt="Next.js logo"
        width={180}
        height={38}
        priority
      />
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-6xl">
        <h1 className="text-2xl font-bold mb-8">얼굴 촬영 시스템</h1>
        
        <div className="grid grid-cols-2 gap-8 w-full">
          {/* 왼쪽 열: 웹캠 */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">카메라</h2>
            <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ zIndex: 1 }}
              />
            </div>
            <button
              onClick={capture}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              촬영하기
        </button>
      </div>

          {/* 오른쪽 열: 결과 */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">촬영 결과</h2>
            <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt="촬영된 사진"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  촬영된 이미지가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        {/* 기존 footer 내용... */}
      </footer>
    </div>
  );
}
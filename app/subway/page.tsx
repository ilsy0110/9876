'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

declare const cv: any;

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpenCVLoaded, setIsOpenCVLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).cv) {
        setIsOpenCVLoaded(true);
      } else {
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.7.0/opencv.js';
        script.async = true;
        script.onload = () => {
          setIsOpenCVLoaded(true);
        };
        document.body.appendChild(script);

        return () => {
          document.body.removeChild(script);
        };
      }
    }
  }, []);

  useEffect(() => {
    if (isOpenCVLoaded) {
      startCamera();
    }
  }, [isOpenCVLoaded]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          processVideo();
        };
      }

      return () => {
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (err) {
      console.error("카메라 접근 오류:", err);
    }
  };

  const processVideo = () => {
    if (!videoRef.current || !canvasRef.current || !isOpenCVLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detectFeatures = () => {
      if (!video || !canvas || !context || !(window as any).cv) return;

      try {
        // 비디오 프레임을 캔버스에 그리기
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // OpenCV 처리
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // 이미지 �처리
        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);
        
        // 얼굴 영역 추정 (화면 중앙)
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const faceSize = Math.min(canvas.width, canvas.height) / 3;

        // 특징점 검출을 위한 설정
        const points = [
          // 왼쪽 눈
          { x: centerX - faceSize/3, y: centerY - faceSize/6 },
          // 오른쪽 눈
          { x: centerX + faceSize/3, y: centerY - faceSize/6 },
          // 코
          { x: centerX, y: centerY + faceSize/6 },
          // 입
          { x: centerX, y: centerY + faceSize/3 }
        ];

        // 각 특징점 주변의 밝기 변화 검사
        points.forEach(point => {
          let roi = gray.roi(new cv.Rect(
            point.x - 10,
            point.y - 10,
            20,
            20
          ));
          
          let mean = cv.mean(roi);
          let color = new cv.Scalar(0, 255, 0);
          
          // 특징점 그리기
          cv.circle(src, new cv.Point(point.x, point.y), 3, color, -1);
          
          roi.delete();
        });

        // 결과 표시
        cv.imshow(canvas, src);

        // 메모리 해제
        src.delete();
        gray.delete();
        blurred.delete();

        requestAnimationFrame(detectFeatures);
      } catch (error) {
        console.error('OpenCV 처리 오류:', error);
        requestAnimationFrame(detectFeatures);
      }
    };

    detectFeatures();
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
        <h1 className="text-2xl mb-4">카메라</h1>
        <div className="flex justify-center">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', maxWidth: '600px' }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                maxWidth: '600px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


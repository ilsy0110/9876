'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

declare const cv: any;

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpenCVLoaded, setIsOpenCVLoaded] = useState(false);
  const [classifiers, setClassifiers] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).cv) {
        initClassifiers();
      } else {
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.7.0/opencv.js';
        script.async = true;
        script.onload = () => {
          initClassifiers();
        };
        document.body.appendChild(script);

        return () => {
          document.body.removeChild(script);
        };
      }
    }
  }, []);

  const initClassifiers = async () => {
    try {
        console.log("@@@@@11111",cv.CascadeClassifier);
      const eyeClassifier = new cv.CascadeClassifier();
      const noseClassifier = new cv.CascadeClassifier();
      const mouthClassifier = new cv.CascadeClassifier();
     
      const loadClassifierFile = async (path: string, filename: string) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}`);
        const data = await response.text();
        cv.FS_createDataFile('/', filename, data, true, false, false);
        return `/${filename}`;
      };

      

      const [eyePath, nosePath, mouthPath] = await Promise.all([
        loadClassifierFile('/haarcascade_eye.xml', 'haarcascade_eye.xml'),
        loadClassifierFile('/haarcascade_mcs_nose.xml', 'haarcascade_mcs_nose.xml'),
        loadClassifierFile('/haarcascade_mcs_mouth.xml', 'haarcascade_mcs_mouth.xml')
      ]);
     
      const eyeResult = eyeClassifier.load(eyePath);
      const noseResult = noseClassifier.load(nosePath);
      const mouthResult = mouthClassifier.load(mouthPath);

      if (eyeResult && noseResult && mouthResult) {
        console.log('분류기 로드 성공');
        setClassifiers({ eye: eyeClassifier, nose: noseClassifier, mouth: mouthClassifier });
        setIsOpenCVLoaded(true);
      } else {
        throw new Error('분류기 로드 실패');
      }
    } catch (error) {
      console.error('분류기 초기화 오류:', error);
    }
  };

  useEffect(() => {
    if (isOpenCVLoaded && classifiers.eye) {
      startCamera();
    }
  }, [isOpenCVLoaded, classifiers]);

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
    if (!videoRef.current || !canvasRef.current || !classifiers.eye) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detectFeatures = () => {
      if (!video || !canvas || !context) return;

      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // 얼굴 영역 검출
        let faces = new cv.RectVector();
        let eyes = new cv.RectVector();
        let nose = new cv.RectVector();
        let mouth = new cv.RectVector();

        // 특징점 검출
        classifiers.eye.detectMultiScale(gray, eyes);
        classifiers.nose.detectMultiScale(gray, nose);
        classifiers.mouth.detectMultiScale(gray, mouth);

        // 연두색 정의 (BGR 형식: Blue=0, Green=255, Red=0)
        const greenColor = new cv.Scalar(0, 255, 0);

        // 눈 표시
        for (let i = 0; i < eyes.size(); ++i) {
          let eye = eyes.get(i);
          let center = new cv.Point(eye.x + eye.width/2, eye.y + eye.height/2);
          cv.circle(src, center, 3, greenColor, -1);
        }

        // 코 표시
        if (nose.size() > 0) {
          let n = nose.get(0);
          let center = new cv.Point(n.x + n.width/2, n.y + n.height/2);
          cv.circle(src, center, 3, greenColor, -1);
        }

        // 입 표시
        if (mouth.size() > 0) {
          let m = mouth.get(0);
          let center = new cv.Point(m.x + m.width/2, m.y + m.height/2);
          cv.circle(src, center, 3, greenColor, -1);
        }

        cv.imshow(canvas, src);

        // 메모리 해제
        src.delete();
        gray.delete();
        faces.delete();
        eyes.delete();
        nose.delete();
        mouth.delete();

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


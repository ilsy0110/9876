export function loadOpenCv(onloadCallback) {
  // OpenCV.js와 필요한 모든 파일을 로드
  const OPENCV_URL = 'https://docs.opencv.org/4.7.0';
  
  // 먼저 OpenCV.js 코어를 로드
  const script = document.createElement('script');
  script.setAttribute('async', '');
  script.setAttribute('type', 'text/javascript');
  script.addEventListener('load', () => {
    console.log('OpenCV.js 로드됨');
    // OpenCV.js가 초기화될 때까지 대기
    cv['onRuntimeInitialized'] = () => {
      console.log('OpenCV 런타임 초기화됨');
      onloadCallback();
    }
  });
  script.src = `${OPENCV_URL}/opencv.js`;
  document.head.appendChild(script);
} 
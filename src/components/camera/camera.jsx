import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import styles from './camera.module.css';

const FaceRecognition = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const inputRef = useRef(null);
  const canvasRefImage = useRef();
  const [imageUrl, setImageUrl] = useState(null);
  const [match, setMatch] = useState(false);
  const [detectionsVideo, setDetectionsVideo] = useState(null); // Define detectionsVideo using useState

  useEffect(() => {
    startVideo();
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(currentStream => {
        videoRef.current.srcObject = currentStream;
      })
      .catch(err => {
        console.log(err);
      });
  };

  const loadModels = async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    ]);
  };

  const faceMyDetect = async () => {
    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();
  
      // Set detectionsVideo using useState
      setDetectionsVideo(detections);
  
      const canvasRealTime = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };
      faceapi.matchDimensions(canvasRealTime, displaySize);
      canvasRealTime
        .getContext('2d')
        .clearRect(0, 0, canvasRealTime.width, canvasRealTime.height);
  
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvasRealTime, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvasRealTime, resizedDetections);
      
      // Comparar con las detecciones de la imagen cargada
      if (imageUrl && detectionsVideo) {
        const areEqual = await compareFaces(detections, detectionsVideo);
        setMatch(areEqual);
      }
    }, 100);
  };
  
  const compareFaces = async (detections1, detections2) => {
    if (!detections1 || !detections2) {
      console.error('No se detectaron rostros para comparar.');
      return false;
    }
  
    const labeledDescriptors1 = detections1.map(detection =>
      new faceapi.LabeledFaceDescriptors('ImagenCargada', [detection.descriptor])
    );
  
    const labeledDescriptors2 = detections2.map(detection =>
      new faceapi.LabeledFaceDescriptors('VideoEnTiempoReal', [detection.descriptor])
    );
  
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors1);
    const matchedResults = labeledDescriptors2.map(descriptor =>
      faceMatcher.findBestMatch(descriptor.descriptor)
    );
  
    // Determina si los rostros coinciden
    const areEqual = matchedResults.every(match => match._label === 'ImagenCargada');
    console.log(areEqual);
    return areEqual;
  };
  
    

  const faceMyDetectImage = async imageData => {
    if (!imageData) {
      console.error('La URL de la imagen es nula.');
      return;
    }

    const blob = await (await fetch(imageData)).blob();
    const img = await faceapi.bufferToImage(blob);
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceExpressions();

    const canvasImage = canvasRefImage.current;
    canvasImage.width = img.width;
    canvasImage.height = img.height;
    const ctx = canvasImage.getContext('2d');
    ctx.clearRect(0, 0, canvasImage.width, canvasImage.height);
    ctx.drawImage(img, 0, 0, canvasImage.width, canvasImage.height);

    const resizedDetections = faceapi.resizeResults(detections, {
      width: img.width,
      height: img.height,
    });

    faceapi.draw.drawDetections(ctx, resizedDetections);
    faceapi.draw.drawFaceLandmarks(ctx, resizedDetections);
    faceapi.draw.drawFaceExpressions(ctx, resizedDetections);
  };



  const handleImageUpload = e => {
    const file = e.target.files[0];
    if (!file) {
      console.error('No se seleccionó ningún archivo.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      console.error('El archivo seleccionado no es una imagen.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
      faceMyDetectImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const startDetection = async () => {
      await loadModels();
      // Ahora puedes iniciar la detección facial
      faceMyDetect();
    };
    startDetection();
  }, []);

  return (
    <div className="myapp">
      <h1>Face Detection</h1>
      <div className={styles.container}>
        <div className={styles.videoContainer}>
          <video
            crossOrigin="anonymous"
            ref={videoRef}
            autoPlay
            className={styles.video}
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className={styles.overlayCanvasvideo}
          />
        </div>
        <div className={styles.imageContainer}>
          {imageUrl && <canvas ref={canvasRefImage} className={styles.imageCanvas} />}
          <input type="file" ref={inputRef} onChange={handleImageUpload} />
        </div>
      </div>
      <p>coincide: {match === true ? 'si' : 'no'}</p>
    </div>
  );
};

export default FaceRecognition;

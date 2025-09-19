import React, {  useEffect, useRef, useState } from 'react'
import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
import {FaceLandmarker, FilesetResolver} from '@mediapipe/tasks-vision';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const videoDetection = () => {

    const videoRef = useRef(null);
    const mediaRecorderRef  = useRef(null);
    const recordedChunks = useRef([]);
    const detectionIntervalRef = useRef(null);

    const [isRecording,setIsRecording] = useState(false);
    const [events,setEvents] = useState("Waiting for events...");
    const [logs,setLogs] = useState([]);
    const [faceDetected,setFaceDetected] = useState(false);


   
    const faceModelRef = useRef(null);
    const faceMeshModelRef = useRef(null);
    const cocoModelRef = useRef(null);
    
    const lastFaceStatusRef = useRef(null);
    const noFaceStartRef = useRef(null);
    const noFaceAlertGivenRef = useRef(false);

    const notFocusingStartRef = useRef(null);
    const notFocusingAlertGivenRef = useRef(false);

    const eyesClosedStartRef = useRef(null);
    const eyesClosedAlertGivenRef = useRef(false);

    const multipleFacesAlertGivenRef = useRef(false);

    const lastObjectDetectionRef = useRef({});

    const WATCHED_OBJECTS = {
        'cell phone': 'Mobile phone',
        book: 'Book / Notes',
        laptop : 'Laptop',
        keyboard: 'Keyboard',
        mouse: 'Mouse',
        remote: 'Remote Control',
        tv : 'TV / Monitor'
    };

    // starting the webcam stream
    useEffect(() => {
        async function initCamera() {
            try {
            const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});  
                if(videoRef.current) videoRef.current.srcObject = stream;
            } catch (error) {
                console.error("Error accessing camera: ",error);
            }
        }
        initCamera();
        
        async function loadModel() {
            faceModelRef.current = await blazeface.load();
            
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            faceMeshModelRef.current = await FaceLandmarker.createFromOptions(vision,{
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'  
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFaceBlendshapes: true,
                
            });

            cocoModelRef.current = await cocoSsd.load();

            console.log("Face model loaded");
        }
        loadModel();

    },[]);

    const addLog = async (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prevLogs => [`[${timestamp}] ${message}`,...prevLogs]);
    };

    const checkEyeFocus = async () => {
        if(!faceMeshModelRef.current || !videoRef.current) return; 
        
        const results = await faceMeshModelRef.current.detectForVideo(videoRef.current, Date.now());

        if(!results?.faceBlendshapes?.length) return ;

        const categories = results.faceBlendshapes[0].categories;

        const lookLeft = categories.find(c => c.categoryName === 'eyeLookOutLeft')?.score > 0.5;
        const lookRight = categories.find(c => c.categoryName === 'eyeLookOutRight')?.score > 0.5;
        const lookDown = categories.find(c => c.categoryName === 'eyeLookDownRight')?.score > 0.7;
        const lookUp = categories.find(c => c.categoryName === 'eyeLookUpRight')?.score > 0.3;        
       
        // console.log({lookLeft,lookRight,lookDown,lookUp});
        
        const blinkLeft = categories.find(c => c.categoryName === 'eyeBlinkLeft')?.score > 0.5;
        const blinkRight = categories.find(c => c.categoryName === 'eyeBlinkRight')?.score > 0.5;

        // console.log(blinkLeft,blinkRight);

        if(blinkLeft && blinkRight) {
            
            if(!eyesClosedStartRef.current) {
                eyesClosedStartRef.current = Date.now();
            }else if(!eyesClosedAlertGivenRef.current && Date.now() - eyesClosedStartRef.current >= 5000) {
                addLog("⚠️ Drowsiness detected: Eyes closed for over 5 seconds");
                eyesClosedAlertGivenRef.current = true;
            }
        }else{
            eyesClosedStartRef.current = null;
            eyesClosedAlertGivenRef.current = false;
        }

        // had to work on looking down detection
        // console.log(lookLeft,lookRight,lookDown,lookUp);
        
        if(lookLeft || lookRight || lookDown || lookUp) {
            if(!notFocusingStartRef.current) {
                notFocusingStartRef.current = Date.now();
            }else{
                const elapsed = Date.now() - notFocusingStartRef.current;
                if(elapsed >= 5000 && !notFocusingAlertGivenRef.current) {
                    addLog("⚠️ Not focusing on the screen for over 5 seconds");
                    notFocusingAlertGivenRef.current = true;
                }   
            }
        }else{
            notFocusingStartRef.current = null;
            notFocusingAlertGivenRef.current = false;
        }      
    };

    const checkObjectDetection = async () => {
        if(!cocoModelRef.current || !videoRef.current) return;
        const predictions = await cocoModelRef.current.detect(videoRef.current);
        const now = Date.now();

        Object.entries(WATCHED_OBJECTS).forEach(([label, friendlyName]) => {
            const found = predictions.find(p => p.class === label && p.score > 0.5);
            if(found) {
                const lastSeen = lastObjectDetectionRef.current[label] || 0;
                if(now - lastSeen > 5000) { 
                    addLog(`⚠️ Detected: ${friendlyName}`);
                }
                lastObjectDetectionRef.current[label] = now;
            }
        });
    };




    const startFaceDetection = () => {  
        if(!faceModelRef.current || !videoRef.current) return;
        detectionIntervalRef.current = setInterval(async () => {
            const predictions = await faceModelRef.current.estimateFaces(videoRef.current, false);

            const faceDetected = predictions.length > 0;
            const statusMessage = faceDetected ? "Face detected" : "No face detected";
            setEvents(statusMessage);

            if(faceDetected){

                if(predictions.length > 1) {
                    if(!multipleFacesAlertGivenRef.current){
                        addLog("⚠️ Multiple faces detected");
                        multipleFacesAlertGivenRef.current = true;  
                    }
                }else{
                    multipleFacesAlertGivenRef.current = false;
                }

                noFaceStartRef.current = null;
                noFaceAlertGivenRef.current = false;

                await checkEyeFocus();
            
            }else{
                if(!noFaceStartRef.current) {
                    noFaceStartRef.current = Date.now();
                }else{
                    const elapsed = Date.now() - noFaceStartRef.current;
                    if(elapsed > 10000 && !noFaceAlertGivenRef.current) {
                        addLog("⚠️ Face missing for over 10 seconds");
                        noFaceAlertGivenRef.current = true;
                    }
                }
            }

            if(lastFaceStatusRef.current !== faceDetected) {
                lastFaceStatusRef.current = faceDetected;
                addLog(statusMessage);
            }

            await checkObjectDetection();

        },400);
    };

    const stopFaceDetection = () => {
        if(detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        lastFaceStatusRef.current = null;
        noFaceStartRef.current = null;
        noFaceAlertGivenRef.current = false;
        notFocusingStartRef.current = null;
        notFocusingAlertGivenRef.current = false;
        setEvents("Waiting for events...");
    };


    const [interviewId,setInterviewId] = useState(null);

    const startRecording = async () => {  

        const res = await fetch('https://proctoring-assignment.onrender.com/interviews',{
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({candidateName: 'Test Candidate'})
        });
        const newInterview = await res.json();
        console.log(newInterview);
        setInterviewId(newInterview._id);


        if(!videoRef.current || !videoRef.current.srcObject) return;
        recordedChunks.current = [];
        const mediaRecorder = new MediaRecorder(videoRef.current.srcObject, {mimeType: 'video/webm'});
        mediaRecorder.ondataavailable = (e) => {
            if(e.data.size > 0) recordedChunks.current.push(e.data);
        }
        mediaRecorder.onstop = saveRecording;
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        addLog("Recording started");
        
        startFaceDetection(); // start face detectomp when recording starts


    };

    const stopRecording = async () => {   
        if(mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            addLog("Recording stopped");
            stopFaceDetection(); // stop face detection when recording stops
            if(interviewId){

                await fetch(`https://proctoring-assignment.onrender.com/interviews/${interviewId}/logs/batch`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ logs: [...logs].reverse() }), // send entire logs array
                });

                await fetch(`https://proctoring-assignment.onrender.com/interviews/${interviewId}/end`,{
                    method: 'PATCH',
                });
            }
        }
    };
    
    const saveRecording = () => {
        const blob = new Blob(recordedChunks.current, {type: 'video/webm'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url;
        a.download = `recording_${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunks.current = [];
        addLog("Recording saved");
    };

    return (
        <div className='flex flex-col items-center space-y-4  bg-gray-100 min-h-screen'>
            <div  className='p-1 bg-white rounded-xl shadow-2xl'>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className='rounded-xl w-[400px] h-[300px] object-cover'
                />
            </div>
            <div className='mt-4 flex gap-4'>
                <button
                    onClick={startRecording}
                    disabled={isRecording}
                    className='px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 disabled:opacity-50'
                >Start Recording</button>
                <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className='px-4 py-2 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 disabled:opacity-50'
                >Stop Recording</button>
            </div>
            <div className='mt-4 p-4 bg-white rounded-xl shadow w-[640px] text-center'>
                <h2 className='text-lg font-semibold mb-2'>Event Logs</h2>
                <p>{events}</p>
            </div>
            <div className='mt-4 p-4 bg-white rounded-xl shadow w-[640px] max-h-48 overflow-y-auto text-center'>
                <h2 className='font-bold text-lg mb-2'>Logs</h2>
                <ul className='text-sm text-gray-700'>
                    {logs.map((log,index) => (
                        <li key={index} className='mb-1'>{log}</li>
                    ))}
                </ul>
            </div>
            
        </div>
    )
}

export default videoDetection
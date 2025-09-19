AI Proctoring System

A full-stack AI proctoring solution that uses webcam monitoring, face detection, eye tracking, object detection, and event logging to monitor a candidate during an interview or test.

Frontend: React + TensorFlow.js + MediaPipe + Coco-SSD

Backend: Node.js + Express + MongoDB

Features:
✅ Face Detection (BlazeFace)
✅ Multiple Face Detection Alert
✅ Face Missing Alert (10 sec)
✅ Eye Tracking (Not focusing alert after 5 sec)
✅ Drowsiness Detection (Eyes closed > 5 sec)
✅ Object Detection (Phone, Books, Laptop, etc.)
✅ Logs with Timestamp (Saved in MongoDB)
✅ Start/Stop Recording & Save Video
✅ Backend API to store interviews and logs


🚀 Features

Real-time Webcam Monitoring using TensorFlow.js & MediaPipe

Face Detection & Tracking (BlazeFace)

Eye Tracking & Focus Detection (MediaPipe FaceLandmarker)

Object Detection (Mobile phone, books, extra devices) using COCO-SSD

Logs & Alerts with timestamps saved to MongoDB

Recording Functionality with download option

REST API for storing candidate interviews and logs

🛠 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/Aryan7973/proctoring-assignment.git
cd proctoring-assignment

2️⃣ Setup Backend (Express + MongoDB)
cd backend
npm install

Start the backend:

node server.js


Your backend should now be running on:

http://localhost:5000

3️⃣ Setup Frontend (React)
cd ../frontend
npm install
npm run dev


Your React app should now be running on:

http://localhost:5173

Candidate Session

Click Start Recording → Webcam will start detecting

Logs will appear in real-time (face detection, focus, objects)

Click Stop Recording → Video is saved locally, logs are pushed to MongoDB

View Logs

Open backend API /interviews to see stored sessions & logs

📸 Tech Stack

Frontend:

React (Functional Components + Hooks)

TensorFlow.js (BlazeFace + Coco-SSD)

MediaPipe (FaceLandmarker Tasks)

TailwindCSS for UI

Backend:

Node.js + Express

MongoDB (Mongoose ODM)

REST API

📦 Deployment

Frontend: Host on Vercel

Backend: Deploy on Render

Make sure to update frontend API calls to use your deployed backend URL.

🧠 Future Improvements

Live stream sharing to interviewer dashboard

Authentication system for candidates/interviewers

Advanced object detection with YOLOv8

Real-time dashboard for multiple candidates

👨‍💻 Author

Developed by Aryan



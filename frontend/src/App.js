import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';

import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Home from './pages/Home/Home';
import Form from './pages/Form/Form';
import NBackTask from './pages/NBack/NBack';
import GoNoGoTask from './pages/GoNoGo/GoNoGo';
import StroopTask from './pages/Stroop/Stroop';
import WebcamAttentiveness from './pages/WebCam/WebcamAttentiveness';
import Mouse from './pages/Mouse/Mouse';
import About from './pages/About/About';
import Games from './pages/Games/Games';
import ResultsPage from './pages/Result/Result';
import ProfilePage from './pages/Profile/Profile';
import BalloonPopTask from './pages/GoNoGo/BalloonPopTask';

import ProtectedRoute from './ProtectedRoute';
import AnimalTapTask from './pages/GoNoGo/AnimalTap';
import PathTraceTask from './pages/GoNoGo/PathTrace';
import SoundFreeze from './pages/GoNoGo/SoundFreeze';
import FindSmilingFace from './pages/GoNoGo/FindSmilingFaces';
import ShapeCatchGame from './pages/GoNoGo/ShapeCatchGame';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home/about" element={<About />} />

        {/* Protected Routes */}
        <Route
          path="/home/form"
          element={
            <ProtectedRoute>
              <Form />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/Nback"
          element={
            <ProtectedRoute>
              <NBackTask />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/GoNoGo"
          element={
            <ProtectedRoute>
              <GoNoGoTask />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/Stroop"
          element={
            <ProtectedRoute>
              <StroopTask />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/WebCam"
          element={
            <ProtectedRoute>
              <WebcamAttentiveness />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/mouse"
          element={
            <ProtectedRoute>
              <Mouse />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/games"
          element={
            <ProtectedRoute>
              <Games />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/results/:id"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

         <Route
          path="/home/BalloonPop"
          element={
            <ProtectedRoute>
              <BalloonPopTask />
            </ProtectedRoute>
          }
        />

         <Route
          path="/home/AnimalTap"
          element={
            <ProtectedRoute>
              <AnimalTapTask />
            </ProtectedRoute>
          }
        />
         <Route
          path="/home/PathTrace"
          element={
            <ProtectedRoute>
              <PathTraceTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/SoundFreeze"
          element={
            <ProtectedRoute>
              <SoundFreeze />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/FindSmilingFaces"
          element={
            <ProtectedRoute>
              <FindSmilingFace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/ShapeCatchGame"
          element={
            <ProtectedRoute>
              <ShapeCatchGame />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

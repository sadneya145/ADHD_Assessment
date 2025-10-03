import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Form from './pages/Form';
import NBackTask from './pages/NBack';
import GoNoGoTask from './pages/GoNoGo';
import StroopTask from './pages/Stroop';
import WebcamAttentiveness from './pages/WebcamAttentiveness'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/form" element={<Form />} />
        <Route path="/Nback" element={<NBackTask />} />
        <Route path="/GoNoGo" element={<GoNoGoTask />} />
        <Route path="/Stroop" element={<StroopTask />} />
        <Route path="/WebCam" element={< WebcamAttentiveness/>} />

      </Routes>
    </Router>
  );
}

export default App;

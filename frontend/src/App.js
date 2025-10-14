import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import Game from './pages/Games/Games';
import ResultsPage from './pages/Result/Result';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home/form" element={<Form />} />
        <Route path="/home/Nback" element={<NBackTask />} />
        <Route path="/home/GoNoGo" element={<GoNoGoTask />} />
        <Route path="/home/Stroop" element={<StroopTask />} />
        <Route path="/home/WebCam" element={< WebcamAttentiveness/>} />
        <Route path="/home/mouse" element={< Mouse/>} />
        <Route path="/home/about" element={<About/>} />
        <Route path="/home/game" element={<Game/>} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </Router>
  );
}

export default App;

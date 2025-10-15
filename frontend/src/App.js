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
import Games from './pages/Games/Games';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/home" element={<Home />} />
        <Route path="/form" element={<Form />} />
        <Route path="/Nback" element={<NBackTask />} />
        <Route path="/GoNoGo" element={<GoNoGoTask />} />
        <Route path="/Stroop" element={<StroopTask />} />
        <Route path="/WebCam" element={< WebcamAttentiveness />} />
        <Route path="/mouse" element={< Mouse />} />
        <Route path='/games' element={<Games />} />
        <Route path='/about' element={<About />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </Router>
  );
}

export default App;

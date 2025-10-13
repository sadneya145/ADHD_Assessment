const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://sadneya:root@cluster0.ncmdlh9.mongodb.net/adhd_assessment?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'logmein123';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ==================== SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  displayName: { type: String },
  photoURL: { type: String },
  createdAt: { type: Date, default: Date.now },
  assessments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' }]
});

const User = mongoose.model('User', userSchema);

// Assessment Schema
const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date, default: Date.now },
  
  // Questionnaire Results
  questionnaire: {
    inattentiveScore: Number,
    hyperactiveScore: Number,
    classification: String,
    responses: [{
      questionId: String,
      question: String,
      response: String,
      category: String
    }]
  },
  
  // Go/No-Go Task Results
  goNoGo: {
    hits: Number,
    misses: Number,
    falseAlarms: Number,
    correctRejections: Number,
    avgReactionTime: Number,
    reactionTimes: [Number]
  },
  
  // N-Back Task Results
  nBack: {
    nLevel: Number,
    hits: Number,
    misses: Number,
    falseAlarms: Number,
    correctRejections: Number,
    accuracy: Number
  },
  
  // Stroop Task Results
  stroop: {
    score: Number,
    totalRounds: Number,
    avgReactionTime: Number,
    reactionTimes: [Number]
  },
  
  // Mouse Tracking Results
  mouseTracking: {
    score: Number,
    mouseMovements: Number,
    analysisResult: {
      adhd_type: String,
      confidence: Number,
      classifications: mongoose.Schema.Types.Mixed
    }
  },
  
  // Overall Assessment
  overallResult: {
    finalClassification: String,
    confidence: Number,
    recommendations: [String]
  }
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

// Mouse Data Schema (for analysis)
const mouseDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  timestamp: { type: Date, default: Date.now },
  mouseData: [{
    time: Number,
    x: Number,
    y: Number
  }],
  analysis: {
    adhd_type: String,
    confidence: Number,
    features: mongoose.Schema.Types.Mixed
  }
});

const MouseData = mongoose.model('MouseData', mouseDataSchema);

// ==================== MIDDLEWARE ====================

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      displayName
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google Auth (store user from Firebase)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, googleId, displayName, photoURL } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        googleId,
        displayName,
        photoURL
      });
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ASSESSMENT ROUTES ====================

// Create/Update Assessment
app.post('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const { questionnaire, goNoGo, nBack, stroop, mouseTracking } = req.body;

    const assessment = new Assessment({
      userId: req.user.userId,
      questionnaire,
      goNoGo,
      nBack,
      stroop,
      mouseTracking,
      overallResult: calculateOverallResult({ questionnaire, goNoGo, nBack, stroop, mouseTracking })
    });

    await assessment.save();

    // Add to user's assessments
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { assessments: assessment._id }
    });

    res.status(201).json({
      message: 'Assessment saved successfully',
      assessment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User's Assessments
app.get('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.userId })
      .sort({ completedAt: -1 });

    res.json({ assessments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Assessment
app.get('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MOUSE TRACKING ANALYSIS ====================

app.post('/api/analyze/mouse', authenticateToken, async (req, res) => {
  try {
    const mouseData = req.body;

    // Save raw mouse data
    const mouseRecord = new MouseData({
      userId: req.user.userId,
      mouseData,
      sessionId: Date.now().toString()
    });

    // Perform analysis
    const analysis = analyzeMouseMovement(mouseData);
    mouseRecord.analysis = analysis;

    await mouseRecord.save();

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

function analyzeMouseMovement(mouseData) {
  if (!mouseData || mouseData.length < 10) {
    return {
      adhd_type: 'Insufficient Data',
      confidence: 0,
      classifications: {}
    };
  }

  // Calculate features
  const velocities = [];
  const accelerations = [];
  const directionChanges = [];

  for (let i = 1; i < mouseData.length; i++) {
    const dt = mouseData[i].time - mouseData[i - 1].time;
    if (dt === 0) continue;

    const dx = mouseData[i].x - mouseData[i - 1].x;
    const dy = mouseData[i].y - mouseData[i - 1].y;
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
    velocities.push(velocity);

    if (i > 1) {
      const prevVelocity = velocities[i - 2];
      const acceleration = Math.abs(velocity - prevVelocity) / dt;
      accelerations.push(acceleration);

      // Direction changes
      const prevDx = mouseData[i - 1].x - mouseData[i - 2].x;
      const prevDy = mouseData[i - 1].y - mouseData[i - 2].y;
      const dotProduct = dx * prevDx + dy * prevDy;
      const magnitude = Math.sqrt(dx * dx + dy * dy) * Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      if (magnitude > 0) {
        const angle = Math.acos(dotProduct / magnitude);
        if (angle > Math.PI / 4) directionChanges.push(angle);
      }
    }
  }

  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const velocityStd = Math.sqrt(velocities.reduce((a, b) => a + Math.pow(b - avgVelocity, 2), 0) / velocities.length);
  const avgAcceleration = accelerations.length > 0 ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length : 0;
  const directionChangeCount = directionChanges.length;

  // Classification logic
  let adhdType = 'No ADHD';
  let confidence = 0;

  if (velocityStd > 5 && avgAcceleration > 0.5) {
    adhdType = 'Hyperactive ADHD';
    confidence = Math.min(85, 60 + velocityStd * 3 + avgAcceleration * 10);
  } else if (directionChangeCount > mouseData.length * 0.3) {
    adhdType = 'Inattentive ADHD';
    confidence = Math.min(80, 55 + (directionChangeCount / mouseData.length) * 100);
  } else if (velocityStd > 3 && directionChangeCount > mouseData.length * 0.2) {
    adhdType = 'Combined ADHD';
    confidence = Math.min(82, 58 + velocityStd * 2 + (directionChangeCount / mouseData.length) * 50);
  } else {
    confidence = Math.max(70, 90 - velocityStd * 2);
  }

  return {
    adhd_type: adhdType,
    confidence: parseFloat(confidence.toFixed(1)),
    classifications: {
      'Avg Velocity': avgVelocity.toFixed(2),
      'Velocity Std Dev': velocityStd.toFixed(2),
      'Avg Acceleration': avgAcceleration.toFixed(2),
      'Direction Changes': directionChangeCount
    }
  };
}

function calculateOverallResult(data) {
  const scores = [];
  let classifications = [];

  // Questionnaire
  if (data.questionnaire) {
    classifications.push(data.questionnaire.classification);
    const totalScore = data.questionnaire.inattentiveScore + data.questionnaire.hyperactiveScore;
    scores.push(totalScore > 10 ? 80 : 40);
  }

  // Go/No-Go
  if (data.goNoGo) {
    const accuracy = data.goNoGo.hits / (data.goNoGo.hits + data.goNoGo.misses + data.goNoGo.falseAlarms);
    scores.push(accuracy < 0.7 ? 70 : 30);
  }

  // N-Back
  if (data.nBack) {
    scores.push(data.nBack.accuracy < 60 ? 65 : 35);
  }

  // Stroop
  if (data.stroop) {
    const stroopAccuracy = (data.stroop.score / data.stroop.totalRounds) * 100;
    scores.push(stroopAccuracy < 70 ? 70 : 30);
  }

  // Mouse Tracking
  if (data.mouseTracking?.analysisResult) {
    classifications.push(data.mouseTracking.analysisResult.adhd_type);
    scores.push(data.mouseTracking.analysisResult.confidence);
  }

  const avgConfidence = scores.reduce((a, b) => a + b, 0) / scores.length;
  const finalClassification = getMostCommonClassification(classifications);

  return {
    finalClassification,
    confidence: parseFloat(avgConfidence.toFixed(1)),
    recommendations: generateRecommendations(finalClassification)
  };
}

function getMostCommonClassification(classifications) {
  const counts = {};
  classifications.forEach(c => counts[c] = (counts[c] || 0) + 1);
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'No ADHD');
}

function generateRecommendations(classification) {
  const recommendations = {
    'No ADHD': [
      'Continue monitoring behavior patterns',
      'Maintain healthy lifestyle and sleep habits',
      'Regular check-ups with healthcare provider'
    ],
    'Inattentive ADHD': [
      'Consult with a psychiatrist for professional evaluation',
      'Consider cognitive behavioral therapy (CBT)',
      'Implement organizational tools and reminders',
      'Break tasks into smaller, manageable steps'
    ],
    'Hyperactive/Impulsive ADHD': [
      'Seek professional medical evaluation',
      'Consider physical activities and exercise routines',
      'Practice mindfulness and relaxation techniques',
      'Structured environment and consistent routines'
    ],
    'Combined ADHD': [
      'Comprehensive evaluation by healthcare professional recommended',
      'Combination of behavioral therapy and possible medication',
      'Structured daily routines with clear expectations',
      'Support groups and family education'
    ]
  };

  return recommendations[classification] || recommendations['No ADHD'];
}

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB connected to: adhd_assessment database`);
});

module.exports = app;
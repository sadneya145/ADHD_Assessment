const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const analyzeMouseWithPython = require('./analyzeMouseWithPython');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));


// MongoDB Connection
const MONGODB_URI =
  'mongodb+srv://sadneya:root@cluster0.ncmdlh9.mongodb.net/adhd_assessment?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'logmein123';

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==================== SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  email: {type: String, required: true, unique: true},
  password: {type: String},
  googleId: {type: String},
  displayName: {type: String},
  photoURL: {type: String},
  age: { type: Number },
  dateOfBirth: { type: Date },
  createdAt: {type: Date, default: Date.now},
  assessments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Assessment'}],
});

const User = mongoose.model('User', userSchema);
const assessmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: Date.now },

    questionnaire: {
      inattentiveScore: { type: Number, default: null },
      hyperactiveScore: { type: Number, default: null },
      classification: String,
      responses: [
        {
          questionId: String,
          question: String,
          response: String,
          category: String,
        },
      ],
    },

    goNoGo: {
      hits: { type: Number, default: null },
      misses: { type: Number, default: null },
      falseAlarms: { type: Number, default: null },
      correctRejections: { type: Number, default: null },
      avgReactionTime: { type: Number, default: null },
      reactionTimes: [Number],
    },

    nBack: {
      nLevel: { type: Number, default: null },
      hits: { type: Number, default: null },
      misses: { type: Number, default: null },
      falseAlarms: { type: Number, default: null },
      correctRejections: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },

    stroop: {
      score: { type: Number, default: null },
      totalRounds: { type: Number, default: null },
      avgReactionTime: { type: Number, default: null },
      reactionTimes: [Number],
    },

    mouseTracking: {
      score: { type: Number, default: null },
      mouseMovements: { type: Number, default: null },
      analysisResult: {
        adhd_type: String,
        confidence: { type: Number, default: null },
        classifications: mongoose.Schema.Types.Mixed,
      },
    },

    // 🧠 Model result from Python assessment
    modelResult: {
      composite_score: { type: Number, default: null },
      likelihood: { type: String, default: null },
      risk_level: { type: String, default: null },
      domain_scores: {
        attention: { type: Number, default: null },
        impulsivity: { type: Number, default: null },
        working_memory: { type: Number, default: null },
      },
      features: mongoose.Schema.Types.Mixed,
    },

    overallResult: {
      finalClassification: String,
      confidence: { type: Number, default: null },
      recommendations: [String],
    },
  },
  { timestamps: true }
);


const Assessment = mongoose.model('Assessment', assessmentSchema);

// Mouse Data Schema (for analysis)

const MouseDataSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  sessionId: {type: String, required: true},
  mouseData: {type: Array, required: true},
  analysis: {
    adhd_type: String,
    confidence: Number,
    features: Object,
  },
  createdAt: {type: Date, default: Date.now},
});

const MouseData = mongoose.model('MouseData', MouseDataSchema);

// ==================== MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // CONSISTENT: Always use userId everywhere
    req.user = {
      userId: decoded.userId,  // Changed from 'id' to 'userId'
      email: decoded.email
    };

    next();
  });
};


// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {email, password, displayName} = req.body;

    // Check if user exists
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({error: 'User already exists'});
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      displayName,
    });

    await user.save();

    // Generate token
    const token = jwt.sign({userId: user._id, email: user.email}, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// ==================== PROFILE ROUTES ====================

// GET PROFILE + STATS
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('assessments');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate stats from assessments
    const assessments = user.assessments || [];
    const totalAssessments = assessments.length;

    const lastAssessment = totalAssessments > 0
      ? assessments[assessments.length - 1].completedAt
      : null;

    // FIX: Return as NUMBER, not string
    let averageCompositeScore = null;
    if (totalAssessments > 0) {
      const sum = assessments.reduce((acc, assessment) => {
        const score = assessment.modelResult?.composite_score;
        return acc + (typeof score === 'number' ? score : 0);
      }, 0);
      averageCompositeScore = sum / totalAssessments;  // Keep as number
    }

    res.json({
      user: {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        age: user.age,
        createdAt: user.createdAt,
      },
      stats: {
        totalAssessments,
        lastAssessment,
        averageCompositeScore,  // Now returns number or null
      },
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// UPDATE PROFILE
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, age } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,  // Changed from req.user.id
      { displayName, age },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET ASSESSMENT HISTORY
app.get('/api/assessments/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const assessments = await Assessment.find({ userId: req.user.userId })  // Changed
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('completedAt modelResult');

    const total = await Assessment.countDocuments({ userId: req.user.userId });

    res.json({
      assessments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalAssessments: total,
      },
    });
  } catch (err) {
    console.error('Assessment history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// DELETE ASSESSMENT
app.delete('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,  // Changed from req.user.id
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Remove reference from User.assessments array
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { assessments: req.params.id },
    });

    res.json({ message: 'Assessment deleted successfully' });
  } catch (err) {
    console.error('Delete assessment error:', err);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const {email, password} = req.body;

    // Find user
    const user = await User.findOne({email});
    if (!user) {
      return res.status(400).json({error: 'Invalid credentials'});
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({error: 'Invalid credentials'});
    }

    // Generate token
    const token = jwt.sign({userId: user._id, email: user.email}, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Google Auth (store user from Firebase)
app.post('/api/auth/google', async (req, res) => {
  try {
    const {email, googleId, displayName, photoURL} = req.body;

    let user = await User.findOne({email});

    if (!user) {
      user = new User({
        email,
        googleId,
        displayName,
        photoURL,
      });
      await user.save();
    }

    const token = jwt.sign({userId: user._id, email: user.email}, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// ==================== ASSESSMENT ROUTES ====================
const runPythonAssessment = require('./runGames');


// ==================== FIXED ASSESSMENT ROUTE ====================
// ==================== FIXED ASSESSMENT ROUTE ====================
app.post('/api/assessments', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received assessment payload:", JSON.stringify(req.body, null, 2));

    // Handle both old format (direct task data) and new format (taskPerformance wrapper)
    const taskPerformance = req.body.taskPerformance || {};
    
    // Extract task data - check both locations
    const goNoGo = taskPerformance.goNoGo || req.body.goNoGo || null;
    const nBack = taskPerformance.nBack || req.body.nBack || null;
    const stroop = taskPerformance.stroop || req.body.stroop || null;
    
    // Extract other data
    const questionnaire = req.body.questionnaire || null;
    const mouseTracking = req.body.mouseTracking || null;
    const age = req.body.age || 12; // Default age if not provided
    let modelResult = req.body.modelResult || null;

    // Validate that we have at least some data
    if (!goNoGo && !nBack && !stroop && !questionnaire && !mouseTracking && !modelResult) {
      return res.status(400).json({ 
        error: 'No assessment data provided',
        received: Object.keys(req.body)
      });
    }

    // If no modelResult provided AND we have task data, run Python assessment
    if (!modelResult || Object.keys(modelResult).length === 0) {
      // Check if we have enough data for Python model
      const hasTaskData = goNoGo || nBack || stroop;
      
      if (hasTaskData) {
        console.log("⚙️ Running Python model");
        const pythonInput = { age: age };
        if (goNoGo) pythonInput.goNoGo = goNoGo;
        if (nBack) pythonInput.nBack = nBack;
        if (stroop) pythonInput.stroop = stroop;
        
        try {
          modelResult = await runPythonAssessment(pythonInput);
          console.log("✅ Python model result:", modelResult);
        } catch (err) {
          console.error("❌ Python assessment failed:", err);
          // Create a more informative fallback
          modelResult = createFallbackModelResult(goNoGo, nBack, stroop);
        }
      } else {
        // No task data, create minimal result
        modelResult = {
          composite_score: 0,
          likelihood: "INCOMPLETE",
          risk_level: "unknown",
          domain_scores: { attention: 0, impulsivity: 0, working_memory: 0 },
          features: {},
          note: "Insufficient task data for assessment"
        };
      }
    }

    // Clean and validate modelResult
    const cleanModelResult = {
      composite_score: Number(modelResult?.composite_score ?? 0),
      likelihood: modelResult?.likelihood || "UNKNOWN",
      risk_level: modelResult?.risk_level || "unknown",
      age_group: modelResult?.age_group || null,
      domain_scores: {
        attention: Number(modelResult?.domain_scores?.attention ?? 0),
        impulsivity: Number(modelResult?.domain_scores?.impulsivity ?? 0),
        working_memory: Number(modelResult?.domain_scores?.working_memory ?? 0),
      },
      features: modelResult?.features || {},
    };

    console.log("🎮 Final model result:", cleanModelResult);

    // Create assessment document
    const assessment = new Assessment({
      userId: req.user.userId,
      questionnaire: questionnaire,
      goNoGo: goNoGo,
      nBack: nBack,
      stroop: stroop,
      mouseTracking: mouseTracking,
      modelResult: cleanModelResult,
      overallResult: {
        finalClassification: cleanModelResult.likelihood,
        confidence: cleanModelResult.composite_score,
        recommendations: generateRecommendationsFromScores(cleanModelResult),
      },
    });

    const saved = await assessment.save();
    
    // Update user's assessment list
    await User.findByIdAndUpdate(
      req.user.userId, 
      { $push: { assessments: saved._id } }
    );

    console.log("✅ Assessment saved:", saved._id);

    res.status(201).json({ 
      message: "✅ Assessment saved successfully", 
      assessment: saved 
    });

  } catch (error) {
    console.error("❌ Error saving assessment:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// Helper function to create fallback results when Python fails
function createFallbackModelResult(goNoGo, nBack, stroop) {
  let attention = 0;
  let impulsivity = 0;
  let workingMemory = 0;
  let count = 0;

  // Simple heuristic calculations
  if (stroop) {
    const stroopAcc = (stroop.score / stroop.totalRounds) * 100;
    attention = stroopAcc;
    workingMemory = stroopAcc * 0.8;
    count++;
  }

  if (goNoGo) {
    const total = goNoGo.hits + goNoGo.misses + goNoGo.falseAlarms;
    if (total > 0) {
      const gonogoAcc = (goNoGo.hits / total) * 100;
      attention = count > 0 ? (attention + gonogoAcc) / 2 : gonogoAcc;
      const falseAlarmRate = (goNoGo.falseAlarms / total) * 100;
      impulsivity = 100 - falseAlarmRate;
      count++;
    }
  }

  if (nBack) {
    const total = nBack.hits + nBack.misses;
    if (total > 0) {
      const nbackAcc = (nBack.hits / total) * 100;
      workingMemory = count > 0 ? (workingMemory + nbackAcc) / 2 : nbackAcc;
      const nbackFalseAlarmRate = nBack.falseAlarms ? 
        (nBack.falseAlarms / (nBack.falseAlarms + (nBack.correctRejections || 0))) * 100 : 0;
      impulsivity = count > 0 ? (impulsivity + (100 - nbackFalseAlarmRate)) / 2 : (100 - nbackFalseAlarmRate);
      count++;
    }
  }

  const composite = 100 - ((attention + impulsivity + workingMemory) / 3);
  
  let likelihood = "Low";
  let risk_level = "low";
  if (composite > 60) {
    likelihood = "High";
    risk_level = "high";
  } else if (composite > 45) {
    likelihood = "Moderate";
    risk_level = "moderate";
  }

  return {
    composite_score: Math.round(composite * 100) / 100,
    likelihood: likelihood,
    risk_level: risk_level,
    domain_scores: {
      attention: Math.round(attention * 100) / 100,
      impulsivity: Math.round(impulsivity * 100) / 100,
      working_memory: Math.round(workingMemory * 100) / 100
    },
    features: {
      note: "Calculated using fallback heuristics"
    }
  };
}

// Helper function to generate recommendations based on scores
function generateRecommendationsFromScores(modelResult) {
  const recommendations = [];
  const { attention, impulsivity, working_memory } = modelResult.domain_scores;
  
  recommendations.push(`Attention Score: ${attention}%`);
  recommendations.push(`Impulsivity Score: ${impulsivity}%`);
  recommendations.push(`Working Memory Score: ${working_memory}%`);

  if (modelResult.likelihood === "High") {
    recommendations.push("Consider consulting with a healthcare professional for a comprehensive evaluation");
    recommendations.push("Implement structured daily routines and organizational systems");
  } else if (modelResult.likelihood === "Moderate" || modelResult.likelihood === "Moderate-High") {
    recommendations.push("Monitor symptoms and consider professional consultation if they persist");
    recommendations.push("Practice mindfulness and stress-reduction techniques");
  } else {
    recommendations.push("Continue maintaining healthy habits and routines");
    recommendations.push("Regular check-ups with healthcare provider recommended");
  }

  return recommendations;
}
// Get User's Assessments
app.get('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.userId })
      .sort({ completedAt: -1 });

    res.json({ assessments });
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Single Assessment
app.get('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId,  // Changed from req.user.id
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json({ assessment });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze/mouse', authenticateToken, async (req, res) => {
  try {
    const mouseData = req.body;
    const analysis = await analyzeMouseWithPython(mouseData);

    const mouseRecord = new MouseData({
      userId: req.user.userId,
      mouseData,
      sessionId: Date.now().toString(),
      analysis: {
        adhd_type: analysis.adhd_type,
        confidence: analysis.confidence,
        features: analysis.classifications,
      },
    });

    await mouseRecord.save();
    res.json(analysis);
  } catch (error) {
    console.error('❌ Mouse analysis error:', error);
    res.status(500).json({error: error.message});
  }
});

// ==================== HELPER FUNCTIONS ====================

function analyzeMouseMovement(mouseData) {
  if (!mouseData || mouseData.length < 10) {
    return {
      adhd_type: 'Insufficient Data',
      confidence: 0,
      classifications: {},
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
      const magnitude =
        Math.sqrt(dx * dx + dy * dy) *
        Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      if (magnitude > 0) {
        const angle = Math.acos(dotProduct / magnitude);
        if (angle > Math.PI / 4) directionChanges.push(angle);
      }
    }
  }

  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const velocityStd = Math.sqrt(
    velocities.reduce((a, b) => a + Math.pow(b - avgVelocity, 2), 0) /
      velocities.length
  );
  const avgAcceleration =
    accelerations.length > 0
      ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length
      : 0;
  const directionChangeCount = directionChanges.length;

  // Classification logic
  let adhdType = 'No ADHD';
  let confidence = 0;

  if (velocityStd > 5 && avgAcceleration > 0.5) {
    adhdType = 'Hyperactive ADHD';
    confidence = Math.min(85, 60 + velocityStd * 3 + avgAcceleration * 10);
  } else if (directionChangeCount > mouseData.length * 0.3) {
    adhdType = 'Inattentive ADHD';
    confidence = Math.min(
      80,
      55 + (directionChangeCount / mouseData.length) * 100
    );
  } else if (velocityStd > 3 && directionChangeCount > mouseData.length * 0.2) {
    adhdType = 'Combined ADHD';
    confidence = Math.min(
      82,
      58 + velocityStd * 2 + (directionChangeCount / mouseData.length) * 50
    );
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
      'Direction Changes': directionChangeCount,
    },
  };
}

function calculateOverallResult(data) {
  const scores = [];
  let classifications = [];

  // Questionnaire
  if (data.questionnaire) {
    classifications.push(data.questionnaire.classification);
    const totalScore =
      data.questionnaire.inattentiveScore + data.questionnaire.hyperactiveScore;
    scores.push(totalScore > 10 ? 80 : 40);
  }

  // Go/No-Go
  if (data.goNoGo) {
    const accuracy =
      data.goNoGo.hits /
      (data.goNoGo.hits + data.goNoGo.misses + data.goNoGo.falseAlarms);
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
    recommendations: generateRecommendations(finalClassification),
  };
}

function getMostCommonClassification(classifications) {
  const counts = {};
  classifications.forEach(c => (counts[c] = (counts[c] || 0) + 1));
  return Object.keys(counts).reduce(
    (a, b) => (counts[a] > counts[b] ? a : b),
    'No ADHD'
  );
}

function generateRecommendations(classification) {
  const recommendations = {
    'No ADHD': [
      'Continue monitoring behavior patterns',
      'Maintain healthy lifestyle and sleep habits',
      'Regular check-ups with healthcare provider',
    ],
    'Inattentive ADHD': [
      'Consult with a psychiatrist for professional evaluation',
      'Consider cognitive behavioral therapy (CBT)',
      'Implement organizational tools and reminders',
      'Break tasks into smaller, manageable steps',
    ],
    'Hyperactive/Impulsive ADHD': [
      'Seek professional medical evaluation',
      'Consider physical activities and exercise routines',
      'Practice mindfulness and relaxation techniques',
      'Structured environment and consistent routines',
    ],
    'Combined ADHD': [
      'Comprehensive evaluation by healthcare professional recommended',
      'Combination of behavioral therapy and possible medication',
      'Structured daily routines with clear expectations',
      'Support groups and family education',
    ],
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
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

app.post('/api/assessments', authenticateToken, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📥 NEW ASSESSMENT REQUEST');
    console.log('='.repeat(80));
    console.log('📊 Request body keys:', Object.keys(req.body));

    // Extract task data
    const taskPerformance = req.body.taskPerformance || {};
    const goNoGo = taskPerformance.goNoGo || req.body.goNoGo || null;
    const nBack = taskPerformance.nBack || req.body.nBack || null;
    const stroop = taskPerformance.stroop || req.body.stroop || null;
    const questionnaire = req.body.questionnaire || null;
    const mouseTracking = req.body.mouseTracking || null;
    let modelResult = req.body.modelResult || null;

    // Get age from request or user profile
    let age = req.body.age || 12;
    
    if (!req.body.age) {
      try {
        const user = await User.findById(req.user.userId).select('age dateOfBirth');
        if (user?.age) {
          age = user.age;
          console.log(`📅 Using age from user profile: ${age}`);
        } else if (user?.dateOfBirth) {
          const birthDate = new Date(user.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          console.log(`📅 Calculated age from DOB: ${age}`);
        }
      } catch (err) {
        console.log('⚠️ Could not fetch user age, using default: 12');
      }
    }

    console.log('🎮 Task data present:', {
      goNoGo: goNoGo ? '✅' : '❌',
      nBack: nBack ? '✅' : '❌',
      stroop: stroop ? '✅' : '❌',
      questionnaire: questionnaire ? '✅' : '❌',
      mouseTracking: mouseTracking ? '✅' : '❌',
      age: age
    });

    // Validate that we have at least some data
    if (!goNoGo && !nBack && !stroop && !questionnaire && !mouseTracking && !modelResult) {
      return res.status(400).json({ 
        error: 'No assessment data provided',
        received: Object.keys(req.body)
      });
    }

    // If no modelResult provided, run Python assessment
    if (!modelResult || Object.keys(modelResult).length === 0) {
      const hasTaskData = goNoGo || nBack || stroop;
      
      if (hasTaskData) {
        console.log('⚙️ Running Python model with age:', age);
        
        // Prepare input for Python
        const pythonInput = { age: age };
        if (goNoGo) pythonInput.goNoGo = goNoGo;
        if (nBack) pythonInput.nBack = nBack;
        if (stroop) pythonInput.stroop = stroop;
        
        console.log('📤 Sending to Python:', JSON.stringify(pythonInput, null, 2));
        
        try {
          modelResult = await runPythonAssessment(pythonInput);
          console.log('✅ Python returned:', JSON.stringify(modelResult, null, 2));
          
          if (modelResult.error) {
            throw new Error(`Python model error: ${modelResult.error}`);
          }
        } catch (err) {
          console.error('❌ Python assessment failed:', err);
          console.log('⚠️ Using JavaScript fallback calculation');
          
          // Fallback calculation
          modelResult = calculateFallbackScores(goNoGo, nBack, stroop, age);
        }
      } else {
        console.log('⚠️ No task data available, creating minimal result');
        modelResult = {
          composite_score: 0,
          likelihood: 'INCOMPLETE',
          risk_level: 'unknown',
          domain_scores: { attention: 0, impulsivity: 0, working_memory: 0 },
          features: {}
        };
      }
    }

    // Clean and validate modelResult
    const cleanModelResult = {
      composite_score: Number(modelResult?.composite_score ?? 0),
      likelihood: modelResult?.likelihood || 'UNKNOWN',
      risk_level: modelResult?.risk_level || 'unknown',
      age_group: modelResult?.age_group || null,
      domain_scores: {
        attention: Number(modelResult?.domain_scores?.attention ?? 0),
        impulsivity: Number(modelResult?.domain_scores?.impulsivity ?? 0),
        working_memory: Number(modelResult?.domain_scores?.working_memory ?? 0),
      },
      features: modelResult?.features || {},
    };

    console.log('📊 Final cleaned model result:', cleanModelResult);

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
        recommendations: generateRecommendations(cleanModelResult),
      },
    });

    const saved = await assessment.save();
    
    // Update user's assessment list
    await User.findByIdAndUpdate(
      req.user.userId, 
      { $push: { assessments: saved._id } }
    );

    console.log('✅ Assessment saved with ID:', saved._id);
    console.log('='.repeat(80) + '\n');

    res.status(201).json({ 
      message: '✅ Assessment saved successfully', 
      assessment: saved 
    });

  } catch (error) {
    console.error('❌ Assessment error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function calculateFallbackScores(goNoGo, nBack, stroop, age) {
  console.log('🔧 Calculating fallback scores...');
  
  let attention = 50;
  let impulsivity = 50;
  let workingMemory = 50;

  // Stroop scoring
  if (stroop && stroop.score !== null && stroop.totalRounds) {
    const stroopAcc = (stroop.score / stroop.totalRounds) * 100;
    attention = stroopAcc;
    workingMemory = stroopAcc * 0.8;
    console.log(`  Stroop: ${stroop.score}/${stroop.totalRounds} = ${stroopAcc.toFixed(1)}%`);
  }

  // Go/No-Go scoring
  if (goNoGo && goNoGo.hits !== null) {
    const total = (goNoGo.hits || 0) + (goNoGo.misses || 0);
    if (total > 0) {
      const gonogoAcc = (goNoGo.hits / total) * 100;
      attention = stroop ? (attention + gonogoAcc) / 2 : gonogoAcc;
      
      const totalNogo = (goNoGo.falseAlarms || 0) + (goNoGo.correctRejections || 0);
      if (totalNogo > 0) {
        const faRate = (goNoGo.falseAlarms || 0) / totalNogo;
        impulsivity = 100 - (faRate * 100);
      }
      console.log(`  Go/No-Go: Accuracy=${gonogoAcc.toFixed(1)}%, FA Rate=${((goNoGo.falseAlarms||0)/totalNogo*100).toFixed(1)}%`);
    }
  }

  // N-Back scoring
  if (nBack && nBack.hits !== null) {
    const total = (nBack.hits || 0) + (nBack.misses || 0);
    if (total > 0) {
      const nbackAcc = (nBack.hits / total) * 100;
      workingMemory = nbackAcc;
      
      const totalNontarget = (nBack.falseAlarms || 0) + (nBack.correctRejections || 0);
      if (totalNontarget > 0) {
        const faRate = (nBack.falseAlarms || 0) / totalNontarget;
        impulsivity = stroop || goNoGo ? (impulsivity + (100 - faRate * 100)) / 2 : (100 - faRate * 100);
      }
      console.log(`  N-Back: Accuracy=${nbackAcc.toFixed(1)}%`);
    }
  }

  // Calculate composite (inverted - higher scores = lower ADHD risk)
  const avgPerformance = (attention + impulsivity + workingMemory) / 3;
  const composite = 100 - avgPerformance;

  // Determine likelihood
  let likelihood = 'Low';
  let risk_level = 'low';
  
  if (composite > 75) {
    likelihood = 'High';
    risk_level = 'high';
  } else if (composite > 60) {
    likelihood = 'Moderate-High';
    risk_level = 'moderate';
  } else if (composite > 45) {
    likelihood = 'Moderate';
    risk_level = 'moderate';
  } else if (composite > 30) {
    likelihood = 'Low-Moderate';
    risk_level = 'low';
  }

  const result = {
    composite_score: Math.round(composite * 100) / 100,
    likelihood: likelihood,
    risk_level: risk_level,
    age_group: age >= 13 ? '13-15' : age >= 9 ? '9-12' : '5-8',
    domain_scores: {
      attention: Math.round(attention * 100) / 100,
      impulsivity: Math.round(impulsivity * 100) / 100,
      working_memory: Math.round(workingMemory * 100) / 100
    },
    features: {
      note: 'Calculated using JavaScript fallback'
    }
  };

  console.log('✅ Fallback result:', result);
  return result;
}

function generateRecommendations(modelResult) {
  const recommendations = [];
  const { attention, impulsivity, working_memory } = modelResult.domain_scores;
  
  recommendations.push(`Attention: ${attention}%`);
  recommendations.push(`Impulse Control: ${impulsivity}%`);
  recommendations.push(`Working Memory: ${working_memory}%`);

  const likelihood = modelResult.likelihood;
  
  if (likelihood === 'High') {
    recommendations.push('⚠️ Consider professional evaluation');
    recommendations.push('📋 Implement structured routines');
    recommendations.push('🧘 Practice mindfulness techniques');
  } else if (likelihood === 'Moderate-High' || likelihood === 'Moderate') {
    recommendations.push('👀 Monitor symptoms regularly');
    recommendations.push('📝 Use organizational tools');
    recommendations.push('💪 Practice self-management strategies');
  } else {
    recommendations.push('✅ Continue healthy habits');
    recommendations.push('🏃 Maintain regular exercise');
    recommendations.push('😴 Ensure adequate sleep');
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
// ==================== MOUSE ANALYSIS ENDPOINT (FIXED) ====================
app.post('/api/analyze/mouse', authenticateToken, async (req, res) => {
  try {
    console.log('\n🐭 ==================== MOUSE ANALYSIS REQUEST ====================');
    console.log('📊 Content-Type:', req.headers['content-type']);
    console.log('📊 Body type:', typeof req.body);
    console.log('📊 Is Array:', Array.isArray(req.body));
    
    // Your frontend sends mouseData as direct array
    const mouseData = req.body;

    // Validation
    if (!Array.isArray(mouseData)) {
      console.error('❌ Not an array:', typeof mouseData);
      return res.status(400).json({
        error: 'Expected array of mouse positions',
        received_type: typeof mouseData,
        adhd_type: 'Error',
        confidence: 0
      });
    }

    if (mouseData.length === 0) {
      console.error('❌ Empty array');
      return res.status(400).json({
        error: 'Empty mouse data array',
        adhd_type: 'Insufficient Data',
        confidence: 0
      });
    }

    if (mouseData.length < 10) {
      console.error('❌ Too few points:', mouseData.length);
      return res.status(400).json({
        error: `Too few data points: ${mouseData.length}. Need at least 10.`,
        adhd_type: 'Insufficient Data',
        confidence: 0
      });
    }

    console.log('✅ Data points:', mouseData.length);
    console.log('📍 First point:', JSON.stringify(mouseData[0]));
    console.log('📍 Last point:', JSON.stringify(mouseData[mouseData.length - 1]));

    // Validate point structure
    const firstPoint = mouseData[0];
    if (!firstPoint || typeof firstPoint.x !== 'number' || typeof firstPoint.y !== 'number') {
      console.error('❌ Invalid point structure:', firstPoint);
      return res.status(400).json({
        error: 'Invalid data point. Each point must have x and y numbers.',
        sample: firstPoint,
        adhd_type: 'Error',
        confidence: 0
      });
    }

    console.log('✅ Data validated successfully');

    // Try Python analysis first
    let analysis;
    try {
      console.log('🐍 Attempting Python analysis...');
      analysis = await analyzeMouseWithPython(mouseData);
      console.log('✅ Python analysis succeeded:', analysis.adhd_type);
    } catch (pythonError) {
      console.error('❌ Python failed:', pythonError.message);
      console.log('⚠️ Using JavaScript fallback');
      analysis = analyzeMouseMovementJS(mouseData);
    }

    // Save to database (optional, don't fail if this fails)
    try {
      const mouseRecord = new MouseData({
        userId: req.user.userId,
        mouseData: mouseData,
        sessionId: Date.now().toString(),
        analysis: {
          adhd_type: analysis.adhd_type,
          confidence: analysis.confidence,
          features: analysis.classifications || {},
        },
      });
      await mouseRecord.save();
      console.log('✅ Saved to database');
    } catch (dbError) {
      console.error('⚠️ DB save failed (non-critical):', dbError.message);
    }

    console.log('🐭 ==================== SUCCESS ====================\n');

    // Return result
    res.json({
      adhd_type: analysis.adhd_type || 'Unknown',
      confidence: analysis.confidence || 0,
      classifications: analysis.classifications || {},
      raw_metrics: analysis.raw_metrics || {}
    });

  } catch (error) {
    console.error('❌ Endpoint error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Server error: ' + error.message,
      adhd_type: 'Error',
      confidence: 0
    });
  }
});


// ==================== ADD THIS JAVASCRIPT FALLBACK FUNCTION ====================
// Add this function somewhere in your index.js (before the SERVER START section)

function analyzeMouseMovementJS(mouseData) {
  console.log('🔧 JS Fallback Analysis');
  
  if (!mouseData || mouseData.length < 10) {
    return {
      adhd_type: 'Insufficient Data',
      confidence: 0,
      classifications: { 'Status': 'Too few data points' },
      raw_metrics: { data_points: mouseData ? mouseData.length : 0 }
    };
  }

  try {
    const velocities = [];
    const accelerations = [];
    let directionChanges = 0;
    let totalDistance = 0;

    // Calculate metrics
    for (let i = 1; i < mouseData.length; i++) {
      const dt = (mouseData[i].time - mouseData[i - 1].time) || 0.016;
      const dx = mouseData[i].x - mouseData[i - 1].x;
      const dy = mouseData[i].y - mouseData[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      totalDistance += distance;
      const velocity = distance / dt;
      velocities.push(velocity);

      if (i > 1) {
        const prevVelocity = velocities[velocities.length - 2];
        const acceleration = Math.abs(velocity - prevVelocity) / dt;
        accelerations.push(acceleration);

        // Check direction change
        const prevDx = mouseData[i - 1].x - mouseData[i - 2].x;
        const prevDy = mouseData[i - 1].y - mouseData[i - 2].y;
        const dotProduct = dx * prevDx + dy * prevDy;
        const magnitude = Math.sqrt(dx*dx + dy*dy) * Math.sqrt(prevDx*prevDx + prevDy*prevDy);
        
        if (magnitude > 0) {
          const cosAngle = Math.max(-1, Math.min(1, dotProduct / magnitude));
          const angle = Math.acos(cosAngle);
          if (angle > Math.PI / 4) directionChanges++;
        }
      }
    }

    // Statistics
    const avgVel = velocities.reduce((a,b) => a+b, 0) / velocities.length;
    const maxVel = Math.max(...velocities);
    const velStd = Math.sqrt(velocities.reduce((a,b) => a + (b-avgVel)**2, 0) / velocities.length);
    const maxAcc = accelerations.length > 0 ? Math.max(...accelerations) : 0;
    const dirChangeRate = directionChanges / mouseData.length;

    const raw_metrics = {
      total_distance: Math.round(totalDistance),
      max_velocity: Math.round(maxVel * 10) / 10,
      mean_velocity: Math.round(avgVel * 10) / 10,
      vel_std: Math.round(velStd * 10) / 10,
      max_acceleration: Math.round(maxAcc),
      direction_changes: directionChanges,
      direction_change_rate: Math.round(dirChangeRate * 1000) / 1000
    };

    // Classifications
    const classifications = {
      'Total Distance': totalDistance > 4000 ? 'High' : totalDistance > 1000 ? 'Borderline' : 'Normal',
      'Max Velocity': maxVel > 1000 ? 'High' : maxVel > 300 ? 'Borderline' : 'Normal',
      'Velocity Variability': velStd > 500 ? 'High' : velStd > 100 ? 'Borderline' : 'Normal',
      'Direction Changes': dirChangeRate > 0.3 ? 'High' : dirChangeRate > 0.1 ? 'Borderline' : 'Normal'
    };

    // Determine type
    const highVel = classifications['Max Velocity'] === 'High';
    const highVar = classifications['Velocity Variability'] === 'High';
    const highDir = classifications['Direction Changes'] === 'High';

    let adhd_type = 'No ADHD Indicators';
    let confidence = 70;

    if ((highVel || highVar) && highDir) {
      adhd_type = 'Combined Type';
      confidence = 75;
    } else if (highVel || highVar) {
      adhd_type = 'Hyperactive Type';
      confidence = 65;
    } else if (highDir) {
      adhd_type = 'Inattentive Type';
      confidence = 60;
    } else {
      const normalCount = Object.values(classifications).filter(v => v === 'Normal').length;
      confidence = 70 + normalCount * 5;
    }

    console.log('✅ Analysis:', adhd_type, confidence);

    return {
      adhd_type,
      confidence: Math.round(confidence * 10) / 10,
      classifications,
      raw_metrics
    };

  } catch (error) {
    console.error('❌ JS analysis error:', error);
    return {
      adhd_type: 'Analysis Error',
      confidence: 0,
      classifications: { 'Error': error.message },
      raw_metrics: {}
    };
  }
}
// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB connected to: adhd_assessment database`);
});

module.exports = app;
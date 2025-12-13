const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { UTApi } = require("uploadthing/server");

// Initialize UploadThing
const utapi = new UTApi({
  apiKey: process.env.UPLOADTHING_SECRET,
});

console.log('✅ UploadThing initialized');

const analyzeMouseWithPython = require('./analyzeMouseWithPython');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

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
  // email: {type: String, required: true, unique: true},
  username: {type: String, required: true, unique: true},
  password: {type: String},
  // googleId: {type: String},
  displayName: {type: String},
  // photoURL: {type: String},
  age: {type: Number, required: true},
  dateOfBirth: {type: Date},
  createdAt: {type: Date, default: Date.now},
  assessments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Assessment'}],
});

const User = mongoose.model('User', userSchema);
const assessmentSchema = new mongoose.Schema(
  {
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    completedAt: {type: Date, default: Date.now},
    videoUrl: {
      type: String,
      default: null
    },
    videoKey: {
      type: String,
      default: null
    },
    videoMetadata: {
      filename: String,
      uploadDate: Date,
      size: Number
    },
    questionnaire: {
      inattentiveScore: {type: Number, default: null},
      hyperactiveScore: {type: Number, default: null},
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
      hits: {type: Number, default: null},
      misses: {type: Number, default: null},
      falseAlarms: {type: Number, default: null},
      correctRejections: {type: Number, default: null},
      avgReactionTime: {type: Number, default: null},
      reactionTimes: [Number],
    },

    nBack: {
      nLevel: {type: Number, default: null},
      hits: {type: Number, default: null},
      misses: {type: Number, default: null},
      falseAlarms: {type: Number, default: null},
      correctRejections: {type: Number, default: null},
      accuracy: {type: Number, default: null},
    },

    stroop: {
      score: {type: Number, default: null},
      totalRounds: {type: Number, default: null},
      avgReactionTime: {type: Number, default: null},
      reactionTimes: [Number],
    },

    mouseTracking: {
      score: {type: Number, default: null},
      mouseMovements: {type: Number, default: null},
      analysisResult: {
        adhd_type: String,
        confidence: {type: Number, default: null},
        classifications: mongoose.Schema.Types.Mixed,
      },
    },

    // 🧠 Model result from Python assessment
    modelResult: {
      composite_score: {type: Number, default: null},
      likelihood: {type: String, default: null},
      risk_level: {type: String, default: null},
      domain_scores: {
        attention: {type: Number, default: null},
        impulsivity: {type: Number, default: null},
        working_memory: {type: Number, default: null},
      },
      features: mongoose.Schema.Types.Mixed,
    },

    overallResult: {
      finalClassification: String,
      confidence: {type: Number, default: null},
      recommendations: [String],
    },
  },
  {timestamps: true}
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
    return res.status(401).json({error: 'Access token required'});
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({error: 'Invalid or expired token'});
    }

    // CONSISTENT: Always use userId everywhere
    req.user = {
      userId: decoded.userId, // Changed from 'id' to 'userId'
      username: decoded.username,
    };

    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {username, password, displayName, age} = req.body;

    // Validation
    if (!username || !password || !age) {
      return res
        .status(400)
        .json({error: 'Username, password, and age are required'});
    }

    if (age < 5 || age > 120) {
      return res.status(400).json({error: 'Invalid age'});
    }

    // Check if user exists
    const existingUser = await User.findOne({username});
    if (existingUser) {
      return res.status(400).json({error: 'Username already exists'});
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      displayName: displayName || username,
      age,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      {userId: user._id, username: user.username, age: user.age},
      JWT_SECRET,
      {expiresIn: '7d'}
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        age: user.age,
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
      return res.status(404).json({error: 'User not found'});
    }

    // Calculate stats from assessments
    const assessments = user.assessments || [];
    const totalAssessments = assessments.length;

    const lastAssessment =
      totalAssessments > 0
        ? assessments[assessments.length - 1].completedAt
        : null;

    // FIX: Return as NUMBER, not string
    let averageCompositeScore = null;
    if (totalAssessments > 0) {
      const sum = assessments.reduce((acc, assessment) => {
        const score = assessment.modelResult?.composite_score;
        return acc + (typeof score === 'number' ? score : 0);
      }, 0);
      averageCompositeScore = sum / totalAssessments; // Keep as number
    }

    res.json({
      user: {
        username: user.username,
        displayName: user.displayName,
        photoURL: user.photoURL,
        age: user.age,
        createdAt: user.createdAt,
      },
      stats: {
        totalAssessments,
        lastAssessment,
        averageCompositeScore, // Now returns number or null
      },
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({error: 'Server error: ' + err.message});
  }
});

// UPDATE PROFILE
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const {displayName, age} = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId, // Changed from req.user.id
      {displayName, age},
      {new: true, select: '-password'}
    );

    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.json({message: 'Profile updated', user});
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({error: 'Failed to update profile'});
  }
});

// GET ASSESSMENT HISTORY
app.get('/api/assessments/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const assessments = await Assessment.find({userId: req.user.userId}) // Changed
      .sort({completedAt: -1})
      .skip(skip)
      .limit(limit)
      .select('completedAt modelResult');

    const total = await Assessment.countDocuments({userId: req.user.userId});

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
    res.status(500).json({error: 'Failed to fetch history'});
  }
});

// DELETE ASSESSMENT
app.delete('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId, // Changed from req.user.id
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    // Remove reference from User.assessments array
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: {assessments: req.params.id},
    });

    res.json({message: 'Assessment deleted successfully'});
  } catch (err) {
    console.error('Delete assessment error:', err);
    res.status(500).json({error: 'Failed to delete assessment'});
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const {username, password} = req.body;

    // Find user
    const user = await User.findOne({username});
    if (!user) {
      return res.status(400).json({error: 'Invalid credentials'});
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({error: 'Invalid credentials'});
    }

    // Generate token
    const token = jwt.sign(
      {userId: user._id, username: user.username, age: user.age},
      JWT_SECRET,
      {expiresIn: '7d'}
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// // Google Auth (store user from Firebase)
// app.post('/api/auth/google', async (req, res) => {
//   try {
//     const {username, googleId, displayName, photoURL} = req.body;

//     let user = await User.findOne({username});

//     if (!user) {
//       user = new User({
//         email,
//         googleId,
//         displayName,
//         photoURL,
//       });
//       await user.save();
//     }

//     const token = jwt.sign({userId: user._id, email: user.email}, JWT_SECRET, {
//       expiresIn: '7d',
//     });

//     res.json({
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         displayName: user.displayName,
//         photoURL: user.photoURL,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({error: error.message});
//   }
// });


// ==================== VIDEO UPLOAD ENDPOINT ====================

app.post('/api/assessments/upload-video', authenticateToken, async (req, res) => {
  try {
    console.log('🎥 ==================== VIDEO UPLOAD ====================');
    
    const {assessmentId, videoBase64} = req.body;
    
    if (!assessmentId || !videoBase64) {
      return res.status(400).json({error: 'Assessment ID and video data required'});
    }

    // Verify assessment belongs to user
    const assessment = await Assessment.findOne({
      _id: assessmentId,
      userId: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    console.log('📤 Uploading to UploadThing...');

    // Convert base64 to buffer
    const base64Data = videoBase64.replace(/^data:video\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create File object
    const file = new File([buffer], `assessment_${assessmentId}_${Date.now()}.webm`, {
      type: 'video/webm'
    });

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles(file);

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    const uploadedFile = uploadResult.data;

    console.log('✅ Video uploaded:', uploadedFile.url);
    console.log('📊 File size:', (buffer.length / 1024 / 1024).toFixed(2), 'MB');

    // Delete old video if exists
    if (assessment.videoKey) {
      try {
        await utapi.deleteFiles(assessment.videoKey);
        console.log('✅ Old video deleted');
      } catch (err) {
        console.error('⚠️ Failed to delete old video:', err);
      }
    }

    // Update assessment
    assessment.videoUrl = uploadedFile.url;
    assessment.videoKey = uploadedFile.key;
    assessment.videoMetadata = {
      filename: uploadedFile.name,
      uploadDate: new Date(),
      size: buffer.length
    };
    
    await assessment.save();

    console.log('✅ Assessment updated');

    res.json({
      message: 'Video uploaded successfully',
      videoUrl: uploadedFile.url,
      videoKey: uploadedFile.key,
      size: buffer.length
    });

  } catch (error) {
    console.error('❌ Video upload error:', error);
    res.status(500).json({error: error.message});
  }
});

// ==================== VIDEO RETRIEVAL ENDPOINT ====================

app.get('/api/assessments/:id/video', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    if (!assessment.videoUrl) {
      return res.status(404).json({error: 'No video for this assessment'});
    }

    console.log('🎬 Returning video URL');

    res.json({
      videoUrl: assessment.videoUrl,
      videoKey: assessment.videoKey,
      metadata: assessment.videoMetadata
    });

  } catch (error) {
    console.error('❌ Video retrieval error:', error);
    res.status(500).json({error: error.message});
  }
});

// ==================== VIDEO DELETION ENDPOINT ====================

app.delete('/api/assessments/:id/video', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    if (!assessment.videoKey) {
      return res.status(404).json({error: 'No video to delete'});
    }

    console.log('🗑️ Deleting video from UploadThing');

    // Delete from UploadThing
    await utapi.deleteFiles(assessment.videoKey);

    // Update assessment
    assessment.videoUrl = null;
    assessment.videoKey = null;
    assessment.videoMetadata = null;
    await assessment.save();

    console.log('✅ Video deleted');

    res.json({message: 'Video deleted successfully'});

  } catch (error) {
    console.error('❌ Video deletion error:', error);
    res.status(500).json({error: error.message});
  }
});

// ==================== VIDEO METADATA ENDPOINT ====================

app.get('/api/assessments/:id/video/info', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    if (!assessment.videoUrl) {
      return res.json({hasVideo: false});
    }

    res.json({
      hasVideo: true,
      videoUrl: assessment.videoUrl,
      videoKey: assessment.videoKey,
      metadata: assessment.videoMetadata
    });

  } catch (error) {
    console.error('❌ Video info error:', error);
    res.status(500).json({error: error.message});
  }
});

// ==================== CLEANUP: Update DELETE assessment ====================

app.delete('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    // Delete associated video from UploadThing if exists
    if (assessment.videoKey) {
      try {
        await utapi.deleteFiles(assessment.videoKey);
        console.log('✅ Associated video deleted');
      } catch (err) {
        console.error('⚠️ Video deletion failed (non-critical):', err);
      }
    }

    // Delete assessment
    await Assessment.findByIdAndDelete(req.params.id);

    // Remove reference from User.assessments array
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: {assessments: req.params.id},
    });

    res.json({message: 'Assessment deleted successfully'});
  } catch (err) {
    console.error('Delete assessment error:', err);
    res.status(500).json({error: 'Failed to delete assessment'});
  }
});

// ==================== ASSESSMENT ROUTES ====================
const runPythonAssessment = require('./runGames');
const runVideoAssessment = require("./runVideoAssessment");

/* ==================== NORMALIZATION HELPERS ==================== */

// ==================== CORRECTED NORMALIZATION HELPERS ====================

/**
 * Normalize FORM results to ADHD severity (0-100)
 * Input: questionnaire scores (0-27 per category)
 * Output: 0-100 where higher = more ADHD symptoms
 */
function normalizeForm(form) {
  if (!form || typeof form.composite_score !== "number") return null;
  
  // Form composite_score is already 0-100 ADHD severity
  // (calculated from inattentive + hyperactive scores)
  return Math.round(form.composite_score);
}

/**
 * Normalize VIDEO results to ADHD severity (0-100)
 * Input: composite_score 0-1 (0 = no ADHD, 1 = severe ADHD)
 * Output: 0-100 where higher = more ADHD symptoms
 */
function normalizeVideo(video) {
  if (!video || typeof video.composite_score !== "number") return null;
  
  // Video returns 0-1 scale where higher = more ADHD
  // Convert to 0-100 scale
  return Math.round(video.composite_score * 100);
}

/**
 * Normalize GAMES results to ADHD severity (0-100)
 * Input: composite_score 0-100 where higher = more ADHD symptoms
 * Output: 0-100 where higher = more ADHD symptoms
 */
function normalizeGames(game) {
  if (!game || typeof game.composite_score !== "number") return null;
  
  // Games model already returns 0-100 ADHD severity
  // Python calculation: composite_score = 100 - normal_composite
  // Where normal_composite is weighted average of GOOD performance scores
  // So higher composite_score = worse performance = more ADHD
  return Math.round(game.composite_score);
}

/**
 * Normalize domain scores from games model to ADHD severity
 * Python returns: higher = better performance (less ADHD)
 * We need: higher = more ADHD symptoms
 */
function normalizeDomainScores(gameResult) {
  if (!gameResult?.domain_scores) {
    return {
      attention: 0,
      impulsivity: 0,
      working_memory: 0
    };
  }

  const domains = gameResult.domain_scores;

  // Invert: 100 - score (because Python scores are "higher = better")
  return {
    attention: Math.round(100 - (domains.attention || 0)),
    impulsivity: Math.round(100 - (domains.impulsivity || 0)),
    working_memory: Math.round(100 - (domains.working_memory || 0))
  };
}

/* ==================== RESULT COMBINATION LOGIC ==================== */

/**
 * Combine multiple assessment results with weighted average
 * All inputs should be 0-100 ADHD severity scale
 */
function combineResults({ formResult, gameResult, videoResult }) {
  const f = normalizeForm(formResult);
  const g = normalizeGames(gameResult);
  const v = normalizeVideo(videoResult);

  console.log('📊 Normalized Scores (0-100 ADHD severity):');
  console.log(`   Form: ${f !== null ? f : 'N/A'}`);
  console.log(`   Games: ${g !== null ? g : 'N/A'}`);
  console.log(`   Video: ${v !== null ? v : 'N/A'}`);

  // All three available: 30% form, 35% games, 35% video
  if (f !== null && g !== null && v !== null) {
    const combined = f * 0.3 + g * 0.35 + v * 0.35;
    console.log(`   Combined: ${combined.toFixed(2)} (all three)`);
    return buildFinal(combined, ["form", "games", "video"]);
  }

  // Games + Video: 60% games, 40% video
  if (g !== null && v !== null) {
    const combined = g * 0.6 + v * 0.4;
    console.log(`   Combined: ${combined.toFixed(2)} (games + video)`);
    return buildFinal(combined, ["games", "video"]);
  }

  // Only games
  if (g !== null) {
    console.log(`   Combined: ${g} (games only)`);
    return buildFinal(g, ["games"]);
  }

  // Only form
  if (f !== null) {
    console.log(`   Combined: ${f} (form only)`);
    return buildFinal(f, ["form"]);
  }

  // Only video
  if (v !== null) {
    console.log(`   Combined: ${v} (video only)`);
    return buildFinal(v, ["video"]);
  }

  return null;
}

/**
 * Build final result object with risk categorization
 * @param {number} score - ADHD severity score (0-100)
 * @param {string[]} sources - Data sources used
 */
function buildFinal(score, sources) {
  return {
    composite_score: Number(score.toFixed(2)),
    likelihood:
      score >= 75 ? "HIGH" :
      score >= 60 ? "MODERATE-HIGH" :
      score >= 45 ? "MODERATE" :
      score >= 30 ? "LOW-MODERATE" : "LOW",
    risk_level:
      score >= 75 ? "high" :
      score >= 60 ? "moderate-high" :
      score >= 45 ? "moderate" :
      score >= 30 ? "low-moderate" : "low",
    sources_used: sources,
  };
}

/* ==================== FORM MODEL CALCULATION ==================== */

/**
 * Calculate form-based ADHD assessment
 * Uses DSM-5 questionnaire scores
 */
function calculateFormResult(questionnaire) {
  if (!questionnaire?.inattentiveScore && !questionnaire?.hyperactiveScore) {
    return null;
  }

  const inattentive = questionnaire.inattentiveScore || 0;
  const hyperactive = questionnaire.hyperactiveScore || 0;

  // Each category: 0-27 (9 questions × 0-3 points each)
  // Calculate percentage of maximum possible score
  const inattentivePercent = (inattentive / 27) * 100;
  const hyperactivePercent = (hyperactive / 27) * 100;

  // Average both categories
  const composite_score = (inattentivePercent + hyperactivePercent) / 2;

  return {
    composite_score: Math.round(composite_score * 100) / 100,
    likelihood: 
      composite_score >= 75 ? "HIGH" :
      composite_score >= 60 ? "MODERATE-HIGH" :
      composite_score >= 45 ? "MODERATE" :
      composite_score >= 30 ? "LOW-MODERATE" : "LOW",
    risk_level:
      composite_score >= 75 ? "high" :
      composite_score >= 60 ? "moderate-high" :
      composite_score >= 45 ? "moderate" :
      composite_score >= 30 ? "low-moderate" : "low",
    domain_scores: {
      inattentive: Math.round(inattentivePercent * 100) / 100,
      hyperactive: Math.round(hyperactivePercent * 100) / 100
    }
  };
}

/* ==================== FIXED ASSESSMENT ROUTE ==================== */

app.post("/api/assessments", authenticateToken, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("📋 NEW ASSESSMENT REQUEST");
    console.log("=".repeat(80));

    const taskPerformance = req.body.taskPerformance || {};
    const goNoGo = taskPerformance.goNoGo || req.body.goNoGo || null;
    const nBack = taskPerformance.nBack || req.body.nBack || null;
    const stroop = taskPerformance.stroop || req.body.stroop || null;
    const mouseTracking = req.body.mouseTracking || null;
    const questionnaire = req.body.questionnaire || null;
    const videoUrl = req.body.videoUrl || null;

    /* ==================== AGE ==================== */
    let age = req.body.age || 12;

    if (!req.body.age) {
      try {
        const user = await User.findById(req.user.userId).select("age dateOfBirth");
        if (user?.age) {
          age = user.age;
        } else if (user?.dateOfBirth) {
          age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
        }
      } catch (err) {
        console.log("⚠️ Using default age: 12");
      }
    }

    console.log(`👤 User age: ${age}`);

    /* ==================== GAMES MODEL ==================== */
    let gameModelResult = null;

    if (goNoGo || nBack || stroop) {
      try {
        const input = { age };
        if (goNoGo) input.goNoGo = goNoGo;
        if (nBack) input.nBack = nBack;
        if (stroop) input.stroop = stroop;

        console.log("🎮 Running games model...");
        gameModelResult = await runPythonAssessment(input);
        
        if (gameModelResult?.error) {
          console.error("❌ Games model error:", gameModelResult.error);
          gameModelResult = null;
        } else {
          console.log(`✅ Games composite: ${gameModelResult.composite_score} (${gameModelResult.likelihood})`);
          console.log(`   Domain scores (Python - higher=better):`);
          console.log(`     Attention: ${gameModelResult.domain_scores?.attention || 0}`);
          console.log(`     Impulsivity: ${gameModelResult.domain_scores?.impulsivity || 0}`);
          console.log(`     Working Memory: ${gameModelResult.domain_scores?.working_memory || 0}`);
        }
      } catch (err) {
        console.error("❌ Games model failed:", err.message);
        gameModelResult = null;
      }
    }

    /* ==================== VIDEO MODEL ==================== */
    let videoModelResult = null;

    if (videoUrl) {
      try {
        console.log("🎥 Running video model...");
        videoModelResult = await runVideoAssessment(videoUrl);
        
        if (videoModelResult?.error) {
          console.error("❌ Video model error:", videoModelResult.error);
          videoModelResult = null;
        } else {
          console.log(`✅ Video result: ${videoModelResult.composite_score} (${videoModelResult.likelihood})`);
        }
      } catch (err) {
        console.error("❌ Video model failed:", err.message);
        videoModelResult = null;
      }
    }

    /* ==================== FORM MODEL ==================== */
    let formModelResult = null;

    if (questionnaire?.inattentiveScore != null || questionnaire?.hyperactiveScore != null) {
      console.log("📝 Calculating form assessment...");
      formModelResult = calculateFormResult(questionnaire);
      console.log(`✅ Form result: ${formModelResult.composite_score} (${formModelResult.likelihood})`);
    }

    /* ==================== COMBINE RESULTS ==================== */
    console.log("\n🧮 Combining results...");
    
    const combined = combineResults({
      formResult: formModelResult,
      gameResult: gameModelResult,
      videoResult: videoModelResult,
    });

    if (!combined) {
      console.log("❌ No valid assessment data provided");
      return res.status(400).json({ 
        error: "No valid assessment data provided",
        hint: "Provide at least one of: questionnaire, games, or video"
      });
    }

    console.log(`\n🎯 FINAL RESULT: ${combined.composite_score} (${combined.likelihood})`);
    console.log(`📊 Sources: ${combined.sources_used.join(", ")}`);

    // Normalize domain scores (invert from "higher=better" to "higher=worse")
    const normalizedDomainScores = normalizeDomainScores(gameModelResult);
    
    console.log(`\n📊 Domain Scores (normalized to ADHD severity):`);
    console.log(`   Attention: ${normalizedDomainScores.attention}`);
    console.log(`   Impulsivity: ${normalizedDomainScores.impulsivity}`);
    console.log(`   Working Memory: ${normalizedDomainScores.working_memory}`);

    /* ==================== SAVE TO DATABASE ==================== */
    const assessment = new Assessment({
      userId: req.user.userId,
      questionnaire,
      goNoGo,
      nBack,
      stroop,
      mouseTracking,
      videoUrl,

      modelResult: {
        composite_score: combined.composite_score,
        likelihood: combined.likelihood,
        risk_level: combined.risk_level,
        
        // Domain scores - NORMALIZED to ADHD severity (higher = worse)
        domain_scores: normalizedDomainScores,
        
        // Store individual component results
        components: {
          form: formModelResult,
          games: gameModelResult, // Keep original with domain scores (higher=better)
          video: videoModelResult
        },
        
        features: {
          ...(gameModelResult?.features || {}),
          video: videoModelResult?.features || {},
          sources_used: combined.sources_used,
        },
      },

      overallResult: {
        finalClassification: combined.likelihood,
        confidence: combined.composite_score,
        componentScores: {
          form: formModelResult?.composite_score,
          games: gameModelResult?.composite_score,
          video: videoModelResult?.composite_score
        }
      },
    });

    const saved = await assessment.save();

    await User.findByIdAndUpdate(req.user.userId, {
      $push: { assessments: saved._id },
    });

    console.log("✅ Assessment saved:", saved._id);
    console.log("=".repeat(80) + "\n");

    res.status(201).json({
      message: "✅ Assessment completed successfully",
      assessment: saved,
      summary: {
        composite_score: combined.composite_score,
        likelihood: combined.likelihood,
        risk_level: combined.risk_level,
        sources_used: combined.sources_used,
        domain_scores: normalizedDomainScores
      }
    });

  } catch (err) {
    console.error("❌ Assessment error:", err);
    console.error("Stack:", err.stack);
    console.error("=".repeat(80) + "\n");
    
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
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
    console.log(
      `  Stroop: ${stroop.score}/${stroop.totalRounds} = ${stroopAcc.toFixed(
        1
      )}%`
    );
  }

  // Go/No-Go scoring
  if (goNoGo && goNoGo.hits !== null) {
    const total = (goNoGo.hits || 0) + (goNoGo.misses || 0);
    if (total > 0) {
      const gonogoAcc = (goNoGo.hits / total) * 100;
      attention = stroop ? (attention + gonogoAcc) / 2 : gonogoAcc;

      const totalNogo =
        (goNoGo.falseAlarms || 0) + (goNoGo.correctRejections || 0);
      if (totalNogo > 0) {
        const faRate = (goNoGo.falseAlarms || 0) / totalNogo;
        impulsivity = 100 - faRate * 100;
      }
      console.log(
        `  Go/No-Go: Accuracy=${gonogoAcc.toFixed(1)}%, FA Rate=${(
          ((goNoGo.falseAlarms || 0) / totalNogo) *
          100
        ).toFixed(1)}%`
      );
    }
  }

  // N-Back scoring
  if (nBack && nBack.hits !== null) {
    const total = (nBack.hits || 0) + (nBack.misses || 0);
    if (total > 0) {
      const nbackAcc = (nBack.hits / total) * 100;
      workingMemory = nbackAcc;

      const totalNontarget =
        (nBack.falseAlarms || 0) + (nBack.correctRejections || 0);
      if (totalNontarget > 0) {
        const faRate = (nBack.falseAlarms || 0) / totalNontarget;
        impulsivity =
          stroop || goNoGo
            ? (impulsivity + (100 - faRate * 100)) / 2
            : 100 - faRate * 100;
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
      working_memory: Math.round(workingMemory * 100) / 100,
    },
    features: {
      note: 'Calculated using JavaScript fallback',
    },
  };

  console.log('✅ Fallback result:', result);
  return result;
}

function generateRecommendations(modelResult) {
  const recommendations = [];
  const {attention, impulsivity, working_memory} = modelResult.domain_scores;

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
    const assessments = await Assessment.find({userId: req.user.userId}).sort({
      completedAt: -1,
    });

    res.json({assessments});
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({error: error.message});
  }
});

// Get Single Assessment
app.get('/api/assessments/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user.userId, // Changed from req.user.id
    });

    if (!assessment) {
      return res.status(404).json({error: 'Assessment not found'});
    }

    res.json({assessment});
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({error: error.message});
  }
});
// ==================== MOUSE ANALYSIS ENDPOINT (FIXED) ====================
app.post('/api/analyze/mouse', authenticateToken, async (req, res) => {
  try {
    console.log(
      '\n🐭 ==================== MOUSE ANALYSIS REQUEST ===================='
    );
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
        confidence: 0,
      });
    }

    if (mouseData.length === 0) {
      console.error('❌ Empty array');
      return res.status(400).json({
        error: 'Empty mouse data array',
        adhd_type: 'Insufficient Data',
        confidence: 0,
      });
    }

    if (mouseData.length < 10) {
      console.error('❌ Too few points:', mouseData.length);
      return res.status(400).json({
        error: `Too few data points: ${mouseData.length}. Need at least 10.`,
        adhd_type: 'Insufficient Data',
        confidence: 0,
      });
    }

    console.log('✅ Data points:', mouseData.length);
    console.log('📍 First point:', JSON.stringify(mouseData[0]));
    console.log(
      '📍 Last point:',
      JSON.stringify(mouseData[mouseData.length - 1])
    );

    // Validate point structure
    const firstPoint = mouseData[0];
    if (
      !firstPoint ||
      typeof firstPoint.x !== 'number' ||
      typeof firstPoint.y !== 'number'
    ) {
      console.error('❌ Invalid point structure:', firstPoint);
      return res.status(400).json({
        error: 'Invalid data point. Each point must have x and y numbers.',
        sample: firstPoint,
        adhd_type: 'Error',
        confidence: 0,
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
      raw_metrics: analysis.raw_metrics || {},
    });
  } catch (error) {
    console.error('❌ Endpoint error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Server error: ' + error.message,
      adhd_type: 'Error',
      confidence: 0,
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
      classifications: {Status: 'Too few data points'},
      raw_metrics: {data_points: mouseData ? mouseData.length : 0},
    };
  }

  try {
    const velocities = [];
    const accelerations = [];
    let directionChanges = 0;
    let totalDistance = 0;

    // Calculate metrics
    for (let i = 1; i < mouseData.length; i++) {
      const dt = mouseData[i].time - mouseData[i - 1].time || 0.016;
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
        const magnitude =
          Math.sqrt(dx * dx + dy * dy) *
          Math.sqrt(prevDx * prevDx + prevDy * prevDy);

        if (magnitude > 0) {
          const cosAngle = Math.max(-1, Math.min(1, dotProduct / magnitude));
          const angle = Math.acos(cosAngle);
          if (angle > Math.PI / 4) directionChanges++;
        }
      }
    }

    // Statistics
    const avgVel = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const maxVel = Math.max(...velocities);
    const velStd = Math.sqrt(
      velocities.reduce((a, b) => a + (b - avgVel) ** 2, 0) / velocities.length
    );
    const maxAcc = accelerations.length > 0 ? Math.max(...accelerations) : 0;
    const dirChangeRate = directionChanges / mouseData.length;

    const raw_metrics = {
      total_distance: Math.round(totalDistance),
      max_velocity: Math.round(maxVel * 10) / 10,
      mean_velocity: Math.round(avgVel * 10) / 10,
      vel_std: Math.round(velStd * 10) / 10,
      max_acceleration: Math.round(maxAcc),
      direction_changes: directionChanges,
      direction_change_rate: Math.round(dirChangeRate * 1000) / 1000,
    };

    // Classifications
    const classifications = {
      'Total Distance':
        totalDistance > 4000
          ? 'High'
          : totalDistance > 1000
          ? 'Borderline'
          : 'Normal',
      'Max Velocity':
        maxVel > 1000 ? 'High' : maxVel > 300 ? 'Borderline' : 'Normal',
      'Velocity Variability':
        velStd > 500 ? 'High' : velStd > 100 ? 'Borderline' : 'Normal',
      'Direction Changes':
        dirChangeRate > 0.3
          ? 'High'
          : dirChangeRate > 0.1
          ? 'Borderline'
          : 'Normal',
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
      const normalCount = Object.values(classifications).filter(
        v => v === 'Normal'
      ).length;
      confidence = 70 + normalCount * 5;
    }

    console.log('✅ Analysis:', adhd_type, confidence);

    return {
      adhd_type,
      confidence: Math.round(confidence * 10) / 10,
      classifications,
      raw_metrics,
    };
  } catch (error) {
    console.error('❌ JS analysis error:', error);
    return {
      adhd_type: 'Analysis Error',
      confidence: 0,
      classifications: {Error: error.message},
      raw_metrics: {},
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

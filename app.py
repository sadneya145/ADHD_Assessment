# app.py - FastAPI Backend for ADHD Assessment
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import shutil
import traceback
import logging
from adhd_final import process_video_job

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ADHD Assessment API",
    version="2.0.0",
    description="Research-validated ADHD screening system using video analysis"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Job store with detailed status tracking
job_store = {}

# ============================================================
# RESPONSE MODELS
# ============================================================

class AnalysisResponse(BaseModel):
    job_id: str
    status: str
    message: str

class ResultResponse(BaseModel):
    job_id: str
    status: str
    results: Optional[dict] = None
    progress: Optional[str] = None
    error: Optional[str] = None

# ============================================================
# BACKGROUND PROCESSING
# ============================================================

def process_video_wrapper(job_id: str, video_path: str, job_store: dict, age: int):
    """
    Wrapper function to handle video processing with better error handling
    """
    try:
        logger.info(f"🎬 Starting video processing for job: {job_id} (age: {age})")
        
        job_store[job_id]["status"] = "processing"
        job_store[job_id]["progress"] = "Analyzing video for ADHD indicators..."
        
        # Call the ADHD analysis function
        results = process_video_job(job_id, video_path, job_store, age=age, frame_skip=3)
        
        # Update job store with results
        job_store[job_id]["status"] = "completed"
        job_store[job_id]["results"] = results
        job_store[job_id]["progress"] = "Analysis complete"
        
        logger.info(f"✅ Video processing completed for job: {job_id}")
        logger.info(f"   Risk Level: {results.get('likelihood', 'N/A')}")
        logger.info(f"   Composite Score: {results.get('composite_score', 'N/A')}")
        
        # Clean up video file after processing
        try:
            if os.path.exists(video_path):
                os.remove(video_path)
                logger.info(f"🗑️ Cleaned up video file: {video_path}")
        except Exception as e:
            logger.warning(f"Failed to delete video file: {e}")
            
    except Exception as e:
        logger.error(f"❌ Error processing video {job_id}: {str(e)}")
        logger.error(traceback.format_exc())
        
        job_store[job_id]["status"] = "error"
        job_store[job_id]["results"] = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        job_store[job_id]["progress"] = f"Error: {str(e)}"

# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    active_jobs = len([j for j in job_store.values() if j["status"] == "processing"])
    completed_jobs = len([j for j in job_store.values() if j["status"] == "completed"])
    
    return {
        "status": "running",
        "service": "ADHD Assessment API",
        "version": "2.0.0",
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "total_jobs": len(job_store),
        "model_status": "loaded",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "model": "loaded",
            "storage": "accessible"
        }
    }

@app.post("/analyze/video", response_model=AnalysisResponse)
async def analyze_video(
    file: UploadFile = File(...),
    age: int = Form(default=10, ge=5, le=15)
):
    """
    Upload video for ADHD analysis
    
    Parameters:
    - file: Video file (mp4, avi, mov)
    - age: Student's age (5-15 years, default: 10)
    
    Returns job_id for polling results
    """
    try:
        # Validate file type
        allowed_extensions = ['.mp4', '.avi', '.mov', '.webm']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Save uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_FOLDER, safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"📥 Received file: {file.filename}, saved as {safe_filename}")
        logger.info(f"   Age: {age} years")

        # Generate job_id
        import uuid
        job_id = str(uuid.uuid4())

        # Initialize job_store entry
        job_store[job_id] = {
            "status": "queued",
            "results": None,
            "created_at": timestamp,
            "progress": "Queued for processing",
            "age": age,
            "filename": file.filename
        }

        # Run processing in background thread
        from threading import Thread
        Thread(
            target=process_video_wrapper,
            args=(job_id, file_path, job_store, age)
        ).start()

        logger.info(f"✅ Job {job_id} queued successfully")

        # Return job_id immediately for frontend polling
        return AnalysisResponse(
            job_id=job_id,
            status="queued",
            message=f"Video uploaded successfully. Processing age {age} years assessment."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("❌ Error handling video upload:")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/results/{job_id}", response_model=ResultResponse)
async def get_results(job_id: str):
    """
    Get analysis results for a specific job
    
    Status values:
    - queued: Job is waiting to be processed
    - processing: Analysis in progress
    - completed: Analysis finished successfully
    - error: Analysis failed
    """
    if job_id not in job_store:
        raise HTTPException(
            status_code=404,
            detail=f"Job {job_id} not found. It may have expired or never existed."
        )
    
    job_data = job_store[job_id]
    
    return ResultResponse(
        job_id=job_id,
        status=job_data["status"],
        results=job_data.get("results"),
        progress=job_data.get("progress"),
        error=job_data.get("results", {}).get("error") if job_data["status"] == "error" else None
    )


@app.get("/jobs")
async def list_jobs():
    """
    List all jobs (for debugging and monitoring)
    """
    return {
        "total_jobs": len(job_store),
        "by_status": {
            "queued": len([j for j in job_store.values() if j["status"] == "queued"]),
            "processing": len([j for j in job_store.values() if j["status"] == "processing"]),
            "completed": len([j for j in job_store.values() if j["status"] == "completed"]),
            "error": len([j for j in job_store.values() if j["status"] == "error"])
        },
        "jobs": {
            job_id: {
                "status": data["status"],
                "progress": data.get("progress"),
                "created_at": data.get("created_at"),
                "age": data.get("age"),
                "filename": data.get("filename")
            }
            for job_id, data in job_store.items()
        }
    }


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """
    Delete a job from the store
    """
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    del job_store[job_id]
    logger.info(f"🗑️ Deleted job: {job_id}")
    
    return {"message": f"Job {job_id} deleted successfully"}


@app.post("/jobs/cleanup")
async def cleanup_old_jobs(hours: int = 24):
    """
    Clean up jobs older than specified hours
    """
    from datetime import timedelta
    
    cutoff_time = datetime.now() - timedelta(hours=hours)
    deleted_count = 0
    
    jobs_to_delete = []
    for job_id, data in job_store.items():
        try:
            created_at = datetime.strptime(data.get("created_at", ""), "%Y%m%d_%H%M%S")
            if created_at < cutoff_time:
                jobs_to_delete.append(job_id)
        except:
            continue
    
    for job_id in jobs_to_delete:
        del job_store[job_id]
        deleted_count += 1
    
    logger.info(f"🗑️ Cleaned up {deleted_count} old jobs")
    
    return {
        "message": f"Deleted {deleted_count} jobs older than {hours} hours",
        "deleted_count": deleted_count
    }


# ============================================================
# EXCEPTION HANDLERS
# ============================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    logger.error(f"❌ Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "type": type(exc).__name__
        }
    )


# ============================================================
# STARTUP/SHUTDOWN EVENTS
# ============================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("="*70)
    logger.info("🚀 ADHD ASSESSMENT API STARTING")
    logger.info("="*70)
    logger.info("✅ API initialized")
    logger.info("✅ CORS middleware configured")
    logger.info("✅ Upload folder ready")
    logger.info("="*70)


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("="*70)
    logger.info("🛑 ADHD ASSESSMENT API SHUTTING DOWN")
    logger.info(f"   Total jobs processed: {len(job_store)}")
    logger.info("="*70)


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting ADHD Assessment API Server...")
    logger.info("   Host: 0.0.0.0")
    logger.info("   Port: 10000")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=10000,
        reload=True,
        log_level="info"
    )
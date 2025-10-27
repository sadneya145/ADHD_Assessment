# app.py
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import os, shutil, traceback, logging
from adhd_final import process_video_job

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ADHD Detection API", version="2.0.0")

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

# Enhanced job store with detailed status tracking
job_store = {}

class AnalysisResponse(BaseModel):
    job_id: str
    status: str
    message: str

class ResultResponse(BaseModel):
    job_id: str
    status: str
    results: dict | None = None
    progress: str | None = None
    error: str | None = None


def process_video_wrapper(job_id: str, video_path: str, job_store: dict):
    """
    Wrapper function to handle video processing with better error handling
    """
    try:
        logger.info(f"🎬 Starting video processing for job: {job_id}")
        job_store[job_id]["status"] = "processing"
        job_store[job_id]["progress"] = "Analyzing video..."
        
        # Call your actual processing function
        results = process_video_job(job_id, video_path, job_store)
        
        # Update job store with results
        job_store[job_id]["status"] = "completed"
        job_store[job_id]["results"] = results
        job_store[job_id]["progress"] = "Analysis complete"
        
        logger.info(f"✅ Video processing completed for job: {job_id}")
        logger.info(f"Results: {results}")
        
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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running", 
        "version": "2.0.0",
        "active_jobs": len([j for j in job_store.values() if j["status"] == "processing"]),
        "total_jobs": len(job_store)
    }
    
import uuid

@app.post("/analyze/video")
async def analyze_video(file: UploadFile = File(...)):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{file.filename}")

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"📥 Received file: {file.filename}, saved as {file_path}")

        # Generate a job_id
        job_id = str(uuid.uuid4())

        # Initialize job_store entry
        job_store[job_id] = {
            "status": "submitted",
            "results": None,
            "created_at": timestamp,
            "progress": "Queued for processing"
        }

        # Run processing asynchronously (in background thread)
        from threading import Thread
        Thread(target=process_video_wrapper, args=(job_id, file_path, job_store)).start()

        # Return job_id immediately so frontend can poll
        return {"job_id": job_id, "status": "submitted", "results": None}

    except Exception as e:
        logger.exception("❌ Error handling video upload:")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/results/{job_id}", response_model=ResultResponse)
async def get_results(job_id: str):
    """
    Get analysis results for a specific job
    """
    if job_id not in job_store:
        raise HTTPException(
            status_code=404, 
            detail=f"Job {job_id} not found. It may have expired or never existed."
        )
    
    job_data = job_store[job_id]
    
    return {
        "job_id": job_id,
        "status": job_data["status"],
        "results": job_data.get("results"),
        "progress": job_data.get("progress"),
        "error": job_data.get("results", {}).get("error") if job_data["status"] == "error" else None
    }


@app.get("/jobs")
async def list_jobs():
    """
    List all jobs (for debugging)
    """
    return {
        "total_jobs": len(job_store),
        "jobs": {
            job_id: {
                "status": data["status"],
                "progress": data.get("progress"),
                "created_at": data.get("created_at")
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


# Exception handler for better error responses
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
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


if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting ADHD Detection API...")
    uvicorn.run(
        "app:app", 
        host="0.0.0.0", 
        port=10000, 
        reload=True,
        log_level="info"
    ) 
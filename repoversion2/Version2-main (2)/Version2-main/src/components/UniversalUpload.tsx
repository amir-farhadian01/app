import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Image as ImageIcon, X, Upload, CheckCircle, AlertCircle, RefreshCw, Trash2, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import { cn } from '../lib/utils';

interface UniversalUploadProps {
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: Error) => void;
  onDelete?: () => void;
  initialUrl?: string;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  folder?: string;
  className?: string;
}

const UniversalUpload: React.FC<UniversalUploadProps> = ({
  onUploadComplete,
  onUploadError,
  onDelete,
  initialUrl,
  label = "Upload Image",
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 5,
  folder = "uploads",
  className
}) => {
  const [mode, setMode] = useState<'idle' | 'camera' | 'scan' | 'uploading' | 'success' | 'error'>(initialUrl ? 'success' : 'idle');
  const [preview, setPreview] = useState<string | null>(initialUrl || null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(initialUrl ? 100 : 0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const storageRefPath = useRef<string | null>(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment"
  };

  const validateFile = (file: File): boolean => {
    // Check MIME type - Be more permissive
    const allowedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const fileType = file.type.toLowerCase();
    
    // Some browsers or files have empty type
    if (fileType && !allowedTypes.some(t => fileType.includes(t.replace('image/', '')) || fileType === t)) {
      // If not in standard list, check extension as fallback
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
      if (!ext || !allowedExts.includes(ext)) {
        const err = `Invalid file type: ${fileType || 'unknown'}. Only ${accept} are allowed.`;
        setErrorMessage(err);
        setMode('error');
        onUploadError?.(new Error(err));
        return false;
      }
    }

    // Check size
    if (file.size > maxSizeMB * 1024 * 1024) {
      const err = `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is ${maxSizeMB}MB.`;
      setErrorMessage(err);
      setMode('error');
      onUploadError?.(new Error(err));
      return false;
    }

    return true;
  };

  const handleUpload = async (file: File | Blob) => {
    if (!auth.currentUser) {
      const err = "Authentication required for upload.";
      setErrorMessage(err);
      setMode('error');
      onUploadError?.(new Error(err));
      return;
    }

    setMode('uploading');
    setUploadProgress(10);

    try {
      if (!storage) throw new Error("Firebase Storage is not initialized.");
      if (!auth.currentUser) throw new Error("User not authenticated.");

      let fileExt = 'webp';
      let fileType = 'image/webp';
      let originalName = 'camera-capture.webp';

      if (file instanceof File) {
        fileExt = file.name.split('.').pop() || 'webp';
        fileType = file.type || 'image/webp';
        originalName = file.name;
      } else if (file instanceof Blob) {
        fileType = file.type || 'image/jpeg';
        if (fileType.includes('png')) fileExt = 'png';
        else if (fileType.includes('jpeg') || fileType.includes('jpg')) fileExt = 'jpg';
        else if (fileType.includes('webp')) fileExt = 'webp';
      }

      console.log(`[DEBUG] Starting upload: folder=${folder}, user=${auth.currentUser.uid}, originalName=${originalName}`);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const fullPath = `${folder}/${auth.currentUser.uid}/${fileName}`;
      const storageRef = ref(storage, fullPath);
      storageRefPath.current = fullPath;
      
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: fileType,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          originalName: originalName,
          uploadTime: new Date().toISOString()
        }
      });

      // Add a timeout fallback (45 seconds)
      const timeoutId = setTimeout(() => {
        if (uploadTask.snapshot.state === 'running') {
          uploadTask.cancel();
          const err = "Upload timed out. This often happens if 'Cloud Storage for Firebase' is not enabled or if security rules are misconfigured.";
          setErrorMessage(err);
          setMode('error');
          onUploadError?.(new Error(err));
        }
      }, 45000);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.max(10, progress));
            console.log(`[DEBUG] Upload progress: ${progress.toFixed(1)}%`);
          }, 
          (error: any) => {
            clearTimeout(timeoutId);
            console.error("UPLOAD ERROR DETAILS:", error);
            let msg = "Upload failed";
            if (error.code === 'storage/unauthorized') {
              msg = "Permission Denied: Ensure Storage rules allow writes. Check your Firebase console permissions.";
            } else if (error.code === 'storage/quota-exceeded') {
              msg = "Storage Quota Exceeded.";
            } else if (error.code === 'storage/retry-limit-exceeded') {
              msg = "Network failure or timeout.";
            }
            const fullError = `${msg} (Code: ${error.code})`;
            setErrorMessage(fullError);
            setMode('error');
            onUploadError?.(new Error(fullError));
            reject(error);
          }, 
          async () => {
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log("[DEBUG] Upload success, download URL:", url);
              setUploadProgress(100);
              setPreview(url);
              setMode('success');
              onUploadComplete(url);
              resolve(url);
            } catch (err: any) {
              setErrorMessage("Failed to retrieve download URL.");
              setMode('error');
              reject(err);
            }
          }
        );
      });
    } catch (error: any) {
      console.error("CRITICAL UPLOAD FAILURE:", error);
      setErrorMessage(error.message || "Unknown error occurred.");
      setMode('error');
      onUploadError?.(error);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      handleUpload(file);
    }
    e.target.value = ''; // Reset input to allow re-selection of the same file
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Convert base64 to blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          // Force a specific mime type for dataurl blob
          const fixedBlob = new Blob([blob], { type: 'image/jpeg' });
          handleUpload(fixedBlob);
        });
    }
  }, [webcamRef]);

  const reset = () => {
    setMode('idle');
    setPreview(null);
    setErrorMessage('');
    setUploadProgress(0);
    storageRefPath.current = null;
  };

  const handleDelete = async () => {
    if (!storage || !preview) return;
    
    setIsDeleting(true);
    try {
      // If we have the current path from this session
      if (storageRefPath.current) {
        const sRef = ref(storage, storageRefPath.current);
        await deleteObject(sRef);
      } else if (preview.includes('firebasestorage.googleapis.com')) {
        // Try to derive ref from URL if possible (fallback)
        try {
          const decodedUrl = decodeURIComponent(preview);
          const pathStart = decodedUrl.indexOf('/o/') + 3;
          const pathEnd = decodedUrl.indexOf('?');
          const fullPath = decodedUrl.substring(pathStart, pathEnd);
          const sRef = ref(storage, fullPath);
          await deleteObject(sRef);
        } catch (e) {
          console.warn("Could not delete from storage via URL derivation", e);
        }
      }
      
      reset();
      onDelete?.();
    } catch (error: any) {
      console.error("Delete Error:", error);
      // Even if storage deletion fails (e.g. file already gone), we reset UI
      reset();
      onDelete?.();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative group">
        <div 
          className={cn(
            "w-full h-56 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
            mode === 'idle' && "hover:border-neutral-400 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800",
            mode === 'uploading' && "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
            mode === 'success' && "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10",
            mode === 'error' && "border-red-500 bg-red-50/50 dark:bg-red-900/10"
          )}
        >
          <AnimatePresence mode="wait">
            {mode === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 p-4 text-center w-full"
              >
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-neutral-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black italic uppercase tracking-tight text-neutral-900 dark:text-white px-2">{label}</p>
                  <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest mt-1 px-4 leading-tight">Select from gallery or use camera</p>
                </div>
                <div className="flex flex-row flex-wrap gap-2 mt-2 w-full px-2 justify-center">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[8px] font-black uppercase tracking-tight hover:scale-105 transition-all shadow-lg flex-1 min-w-[70px]"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Gallery
                  </button>
                  <button 
                    onClick={() => setMode('camera')}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl text-[8px] font-black uppercase tracking-tight hover:scale-105 transition-all shadow-sm flex-1 min-w-[70px]"
                  >
                    <Camera className="w-3 h-3" />
                    Camera
                  </button>
                  <button 
                    onClick={() => setMode('scan')}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-emerald-500 text-white rounded-xl text-[8px] font-black uppercase tracking-tight hover:scale-105 transition-all shadow-md flex-1 min-w-[70px]"
                  >
                    <Scan className="w-3 h-3" />
                    Scan
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileSelect} 
                  accept={`${accept},.jpg,.jpeg,.png,.webp`} 
                  className="hidden" 
                />
              </motion.div>
            )}

            {mode === 'camera' && (
              <motion.div 
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-black"
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/webp"
                  videoConstraints={videoConstraints}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-4 flex justify-center items-center gap-4 px-4">
                  <button 
                    onClick={() => setMode('idle')}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all shadow-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={capture}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all border-4 border-neutral-200"
                  >
                    <div className="w-12 h-12 bg-neutral-900 rounded-full" />
                  </button>
                  <div className="w-12" /> {/* Spacer */}
                </div>
              </motion.div>
            )}

            {mode === 'scan' && (
              <motion.div 
                key="scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-black"
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/webp"
                  videoConstraints={videoConstraints}
                  className="w-full h-full object-cover opacity-80"
                />
                
                {/* Scanner Overlay UI */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-[85%] aspect-[1.6/1] border-2 border-emerald-500 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                    
                    {/* Scanning Line Animation */}
                    <motion.div 
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-20"
                    />

                    <div className="absolute inset-x-0 -bottom-10 flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap bg-emerald-900/40 px-3 py-1 rounded-full backdrop-blur-md">Place document in frame</span>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-4 flex justify-center items-center gap-6 px-4 z-30">
                  <button 
                    onClick={() => setMode('idle')}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={capture}
                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-90 transition-all border-4 border-white"
                  >
                    <Scan className="w-8 h-8 text-white" />
                  </button>
                  <div className="w-10" />
                </div>
              </motion.div>
            )}

            {mode === 'uploading' && (
              <motion.div 
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                <div>
                  <p className="text-sm font-black italic uppercase tracking-tight text-app-text">Uploading Securely...</p>
                  <div className="w-48 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-3 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'success' && preview && (
              <motion.div 
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-200 dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
              >
                <img src={preview} alt="Upload Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[2px] gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl scale-110 mb-2">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  
                  <div className="flex flex-col gap-2 w-48">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2.5 bg-white text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Change Image
                    </button>
                    
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete File
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 p-6 text-center"
              >
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div>
                  <p className="text-sm font-black italic uppercase tracking-tight text-red-500">Upload Failed</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">{errorMessage}</p>
                </div>
                <button 
                  onClick={reset}
                  className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg mt-2"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UniversalUpload;

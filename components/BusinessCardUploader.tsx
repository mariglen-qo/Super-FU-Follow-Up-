import React, { useState, useCallback, useRef } from 'react';
import { analyzeBusinessCard } from '../services/geminiService';
import { Contact } from '../types';

interface BusinessCardUploaderProps {
    onContactAdd: (newContact: Omit<Contact, 'id'>) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const ImagePreview: React.FC<{ file: File, onRemove: () => void }> = ({ file, onRemove }) => (
    <div className="relative group w-full h-32">
        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover rounded-lg" />
        <button 
            onClick={onRemove}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5"
            aria-label="Remove image"
        >
            &#x2715;
        </button>
    </div>
);

const CameraModal: React.FC<{ onCapture: (file: File) => void, onClose: () => void }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    React.useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(mediaStream => {
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            })
            .catch(err => {
                console.error("Error accessing camera:", err);
                alert("Could not access camera. Please check permissions.");
                onClose();
            });

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [onClose]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context?.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
            canvasRef.current.toBlob(blob => {
                if (blob) {
                    onCapture(new File([blob], `capture.jpg`, { type: 'image/jpeg' }));
                }
            }, 'image/jpeg');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-lg w-full">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-md"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="flex justify-center mt-4 space-x-4">
                    <button onClick={handleCapture} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold">Capture</button>
                    <button onClick={onClose} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white px-6 py-2 rounded-lg">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const BusinessCardUploader: React.FC<BusinessCardUploaderProps> = ({ onContactAdd, showToast }) => {
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraForSide, setCameraForSide] = useState<'front' | 'back' | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        if (e.target.files && e.target.files[0]) {
            side === 'front' ? setFrontImage(e.target.files[0]) : setBackImage(e.target.files[0]);
        }
    };

    const handleCameraCapture = (file: File) => {
        if (cameraForSide === 'front') setFrontImage(file);
        if (cameraForSide === 'back') setBackImage(file);
        setIsCameraOpen(false);
        setCameraForSide(null);
    };
    
    const handleSubmit = useCallback(async () => {
        if (!frontImage) {
            showToast('Please upload at least the front image of the business card.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const extractedData = await analyzeBusinessCard(frontImage, backImage);
            const newContact: Omit<Contact, 'id'> = {
                name: extractedData.name || '',
                email: extractedData.email || '',
                phone: extractedData.phone || '',
                company: extractedData.company || '',
                title: extractedData.title || '',
                address: extractedData.address || '',
                notes: '',
                frontImage: frontImage ? URL.createObjectURL(frontImage) : null,
                backImage: backImage ? URL.createObjectURL(backImage) : null,
            };
            onContactAdd(newContact);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [frontImage, backImage, onContactAdd, showToast]);

    const renderUploadBox = (side: 'front' | 'back') => {
        const image = side === 'front' ? frontImage : backImage;
        const setImage = side === 'front' ? setFrontImage : setBackImage;

        return (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
                <h3 className="font-semibold capitalize">{side} of Card</h3>
                {image ? (
                    <ImagePreview file={image} onRemove={() => setImage(null)} />
                ) : (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span>No image selected</span>
                    </div>
                )}
                <div className="flex space-x-2">
                    <label htmlFor={`${side}-upload`} className="cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium py-1 px-3 rounded-md">Select File</label>
                    <button onClick={() => { setCameraForSide(side); setIsCameraOpen(true); }} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium py-1 px-3 rounded-md">Take Photo</button>
                </div>
                <input id={`${side}-upload`} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, side)} />
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
            {isCameraOpen && <CameraModal onCapture={handleCameraCapture} onClose={() => setIsCameraOpen(false)} />}
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Scan a Business Card</h2>
            <p className="text-center text-gray-500 dark:text-gray-400">Upload or take photos of a business card to automatically create a contact profile.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderUploadBox('front')}
                {renderUploadBox('back')}
            </div>

            <button
                onClick={handleSubmit}
                disabled={isLoading || !frontImage}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-300"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                    </>
                ) : (
                    'Create Profile'
                )}
            </button>
        </div>
    );
};

export default BusinessCardUploader;
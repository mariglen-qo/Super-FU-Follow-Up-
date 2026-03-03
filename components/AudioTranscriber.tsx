
import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";

interface AudioTranscriberProps {
    onTranscript: (text: string) => void;
}

const AudioTranscriber: React.FC<AudioTranscriberProps> = ({ onTranscript }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTranscription, setCurrentTranscription] = useState('');

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const encode = (bytes: Uint8Array): string => {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    const createBlob = (data: Float32Array): GenaiBlob => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const startTranscription = useCallback(async () => {
        setIsRecording(true);
        setCurrentTranscription('');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            if (!process.env.API_KEY) {
                throw new Error("API_KEY not found");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.debug('Live session opened');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                             setCurrentTranscription(prev => prev + text);
                        }
                        if (message.serverContent?.turnComplete) {
                           //
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        stopTranscription();
                    },
                    onclose: (e: CloseEvent) => {
                        console.debug('Live session closed');
                    },
                },
                config: {
                    inputAudioTranscription: {},
                    responseModalities: [],
                },
            });

        } catch (error) {
            console.error("Error starting transcription:", error);
            setIsRecording(false);
        }
    }, []);

    const stopTranscription = useCallback(async () => {
        setIsRecording(false);
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (inputAudioContextRef.current) {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
    }, []);

    const handleConfirm = () => {
        onTranscript(currentTranscription);
        setIsModalOpen(false);
        stopTranscription();
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        stopTranscription();
    };


    return (
        <>
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-2 right-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2"
                title="Add note with voice"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Transcribe Audio Note</h3>
                        <div className="mt-4 p-4 border dark:border-gray-600 rounded-md min-h-[100px] bg-gray-50 dark:bg-gray-700">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{currentTranscription || '...'}</p>
                        </div>
                        <div className="mt-5 flex justify-center">
                            {!isRecording ? (
                                <button
                                    type="button"
                                    onClick={startTranscription}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Start Recording
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={stopTranscription}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                                >
                                    Stop Recording
                                </button>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={handleCancel} className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</button>
                            <button type="button" onClick={handleConfirm} className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700">Add to Notes</button>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
};

export default AudioTranscriber;

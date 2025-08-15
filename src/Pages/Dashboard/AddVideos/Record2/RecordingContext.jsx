import React, { createContext, useContext, useEffect, useState } from "react";

// 1. Create context
const RecordingContext = createContext();

// 2. Custom hook to use the context
export const useRecording = () => useContext(RecordingContext);

// 3. Provider component
export const RecordingProvider = ({ children }) => {
    const [currentSession, setCurrentSession] = useState(null);
    const [recordingState, setRecordingState] = useState('idle');
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [recordingStartTime, setRecordingStartTime] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    useEffect(() => {
        let interval;
        if (recordingState === 'recording' && recordingStartTime) {
            interval = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [recordingState, recordingStartTime]);

    const value = {
        currentSession,
        setCurrentSession,
        recordingState,
        setRecordingState,
        mediaRecorder,
        setMediaRecorder,
        recordedChunks,
        setRecordedChunks,
        recordingStartTime,
        setRecordingStartTime,
        recordingDuration,
        setRecordingDuration,
    };

    return (
        <RecordingContext.Provider value={value}>
            {children}
        </RecordingContext.Provider>
    );
};

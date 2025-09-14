import { UI_CONSTANTS, WEBRTC_CONFIG } from '../utils/constants.js';
import { formatDuration, createObjectURL, revokeObjectURL } from '../utils/helpers.js';
import { appState } from '../store/AppState.js';

/**
 * Service for handling media operations including voice recording and video calls
 */
class MediaService {
    constructor() {
        this.mediaRecorder = null;
        this.isRecording = false;
        this.recordingChunks = [];
        this.recordingStartTime = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isInCall = false;
    }

    // Voice Recording
    async startVoiceRecording() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Media recording not supported');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.mediaRecorder = new MediaRecorder(stream);
            this.recordingChunks = [];
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordingChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processVoiceRecording();
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            return true;
        } catch (error) {
            console.error('Error starting voice recording:', error);
            throw error;
        }
    }

    async stopVoiceRecording() {
        try {
            if (!this.mediaRecorder || !this.isRecording) {
                throw new Error('No active recording');
            }

            this.mediaRecorder.stop();
            this.isRecording = false;

            // Stop all tracks to release microphone
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

            return true;
        } catch (error) {
            console.error('Error stopping voice recording:', error);
            throw error;
        }
    }

    processVoiceRecording() {
        const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
        const duration = Date.now() - this.recordingStartTime;
        const url = createObjectURL(blob);

        return {
            blob,
            url,
            duration,
            size: blob.size
        };
    }

    isCurrentlyRecording() {
        return this.isRecording;
    }

    // Video/Voice Calls
    async initializeCall(type = 'voice') {
        try {
            const constraints = {
                audio: true,
                video: type === 'video'
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.setupPeerConnection();

            return this.localStream;
        } catch (error) {
            console.error('Error initializing call:', error);
            throw error;
        }
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(WEBRTC_CONFIG);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            appState.emit('remoteStreamReceived', this.remoteStream);
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Send ICE candidate to remote peer via signaling server
                appState.emit('iceCandidateGenerated', event.candidate);
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            appState.emit('callConnectionStateChanged', state);
            
            if (state === 'connected') {
                this.isInCall = true;
            } else if (state === 'disconnected' || state === 'failed') {
                this.endCall();
            }
        };
    }

    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    }

    async createAnswer(offer) {
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            return answer;
        } catch (error) {
            console.error('Error creating answer:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }

    async addIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return !audioTrack.enabled; // Returns true if muted
            }
        }
        return false;
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled; // Returns true if video is on
            }
        }
        return false;
    }

    endCall() {
        this.isInCall = false;

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.remoteStream = null;
        appState.setCallActive(false);
    }

    getLocalStream() {
        return this.localStream;
    }

    getRemoteStream() {
        return this.remoteStream;
    }

    isCallActive() {
        return this.isInCall;
    }

    // Audio playback for voice messages
    createAudioPlayer(audioBlob) {
        const url = createObjectURL(audioBlob);
        const audio = new Audio(url);
        
        return {
            audio,
            url,
            play: () => audio.play(),
            pause: () => audio.pause(),
            setCurrentTime: (time) => { audio.currentTime = time; },
            getDuration: () => audio.duration,
            getCurrentTime: () => audio.currentTime,
            destroy: () => {
                audio.pause();
                audio.src = '';
                revokeObjectURL(url);
            }
        };
    }

    // File handling
    async processImageFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Not an image file'));
                return;
            }

            if (file.size > UI_CONSTANTS.MAX_FILE_SIZE) {
                reject(new Error('File too large'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    file,
                    preview: e.target.result,
                    size: file.size,
                    type: file.type
                });
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    compressImage(file, maxWidth = 1024, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = createObjectURL(file);
        });
    }
}

export const mediaService = new MediaService();
export default mediaService;
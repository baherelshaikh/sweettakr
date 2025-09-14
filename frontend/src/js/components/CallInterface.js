import { mediaService } from '../services/MediaService.js';
import { appState } from '../store/AppState.js';
import { userService } from '../services/UserService.js';
import { CALL_TYPES } from '../utils/constants.js';

/**
 * Component for managing voice and video call interface
 */
class CallInterface {
    constructor() {
        this.container = null;
        this.localVideo = null;
        this.remoteVideo = null;
        this.callControls = null;
        this.isVideoEnabled = true;
        this.isMuted = false;
        this.callStartTime = null;
        this.callTimer = null;
    }

    init(container) {
        this.container = container;
        this.localVideo = container.querySelector('#local-video');
        this.remoteVideo = container.querySelector('#remote-video');
        this.callControls = container.querySelector('.call-controls');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // App state listeners
        appState.on('callStateChanged', ({ active, type, contact }) => {
            if (active) {
                this.startCall(type, contact);
            } else {
                this.endCall();
            }
        });

        appState.on('remoteStreamReceived', (stream) => {
            this.handleRemoteStream(stream);
        });

        // Call control buttons
        const muteBtn = this.container.querySelector('#mute-btn');
        const videoBtn = this.container.querySelector('#video-btn');
        const endCallBtn = this.container.querySelector('#end-call-btn');

        muteBtn?.addEventListener('click', () => this.toggleMute());
        videoBtn?.addEventListener('click', () => this.toggleVideo());
        endCallBtn?.addEventListener('click', () => this.endCall());
    }

    async startCall(type, contact) {
        try {
            this.showCallInterface();
            this.updateCallHeader(contact, 'Connecting...');
            this.startCallTimer();

            // Initialize media
            const localStream = await mediaService.initializeCall(type);
            
            if (this.localVideo) {
                this.localVideo.srcObject = localStream;
            }

            // Update UI based on call type
            if (type === CALL_TYPES.VOICE) {
                this.localVideo.style.display = 'none';
                this.remoteVideo.style.display = 'none';
            } else {
                this.localVideo.style.display = 'block';
                this.remoteVideo.style.display = 'block';
            }

            this.updateCallHeader(contact, 'Connected');
            
        } catch (error) {
            console.error('Error starting call:', error);
            this.handleCallError(error);
        }
    }

    endCall() {
        mediaService.endCall();
        this.hideCallInterface();
        this.stopCallTimer();
        this.resetCallState();
    }

    toggleMute() {
        this.isMuted = mediaService.toggleMute();
        const muteBtn = this.container.querySelector('#mute-btn');
        if (muteBtn) {
            muteBtn.classList.toggle('active', this.isMuted);
            muteBtn.querySelector('svg').innerHTML = this.isMuted 
                ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
                : '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>';
        }
    }

    toggleVideo() {
        this.isVideoEnabled = mediaService.toggleVideo();
        const videoBtn = this.container.querySelector('#video-btn');
        if (videoBtn) {
            videoBtn.classList.toggle('active', !this.isVideoEnabled);
            
            if (this.localVideo) {
                this.localVideo.style.display = this.isVideoEnabled ? 'block' : 'none';
            }
        }
    }

    handleRemoteStream(stream) {
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = stream;
        }
    }

    showCallInterface() {
        this.container.classList.remove('hidden');
        document.body.classList.add('call-active');
    }

    hideCallInterface() {
        this.container.classList.add('hidden');
        document.body.classList.remove('call-active');
    }

    updateCallHeader(contact, status) {
        const contactNameElement = this.container.querySelector('#call-contact-name');
        const statusElement = this.container.querySelector('#call-status');
        
        if (contactNameElement && contact) {
            contactNameElement.textContent = userService.getDisplayName(contact);
        }
        
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            this.updateCallDuration();
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    updateCallDuration() {
        if (!this.callStartTime) return;
        
        const duration = Date.now() - this.callStartTime;
        const statusElement = this.container.querySelector('#call-status');
        if (statusElement) {
            statusElement.textContent = this.formatCallDuration(duration);
        }
    }

    formatCallDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    resetCallState() {
        this.isVideoEnabled = true;
        this.isMuted = false;
        this.callStartTime = null;
        
        // Reset video elements
        if (this.localVideo) {
            this.localVideo.srcObject = null;
            this.localVideo.style.display = 'block';
        }
        
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            this.remoteVideo.style.display = 'block';
        }
        
        // Reset button states
        const muteBtn = this.container.querySelector('#mute-btn');
        const videoBtn = this.container.querySelector('#video-btn');
        
        muteBtn?.classList.remove('active');
        videoBtn?.classList.remove('active');
    }

    handleCallError(error) {
        console.error('Call error:', error);
        this.updateCallHeader(null, 'Call failed');
        
        setTimeout(() => {
            this.endCall();
        }, 2000);
    }

    // Call signaling methods (would integrate with WebRTC signaling)
    async initiateCall(contactId, type = CALL_TYPES.VOICE) {
        try {
            const contact = appState.getUser(contactId);
            if (!contact) {
                throw new Error('Contact not found');
            }

            appState.setCallActive(true, type, contact);
            
            // In a real implementation, you would send call invitation through socket
            // socketClient.emit('call:invite', { contactId, type });
            
        } catch (error) {
            console.error('Error initiating call:', error);
            this.handleCallError(error);
        }
    }

    async acceptCall(callData) {
        try {
            appState.setCallActive(true, callData.type, callData.contact);
            
            // Initialize media and create answer
            await this.startCall(callData.type, callData.contact);
            
        } catch (error) {
            console.error('Error accepting call:', error);
            this.handleCallError(error);
        }
    }

    rejectCall() {
        // In real implementation, send rejection through socket
        // socketClient.emit('call:reject');
        this.endCall();
    }
}

export const callInterface = new CallInterface();
export default callInterface;
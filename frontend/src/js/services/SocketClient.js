import { SOCKET_EVENTS, API_CONFIG } from '../utils/constants.js';
import { getAuthToken, handleError } from '../utils/helpers.js';
import { appState } from '../store/AppState.js';
import { io } from 'socket.io-client';
import { STORAGE_KEYS } from '../utils/constants.js';


/**
 * WebSocket client for real-time communication
 */
class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    // connect() {
    //     return new Promise((resolve, reject) => {
    //         const token = getAuthToken();
    //         if (!token) {
    //             reject(new Error('No authentication token found'));
    //             return;
    //         }
    //         console.log('Connecting to socket with token:', token);
            
    //         try {
    //             console.log('socket link', API_CONFIG.SOCKET_URL, token);
    //             this.socket = io(API_CONFIG.SOCKET_URL, {
    //                 auth: {
    //                     token: token
    //                 },
    //                 transports: ['websocket', 'polling'], // fallback options
    //                 reconnection: true, // Enable built-in reconnection
    //                 reconnectionAttempts: 5, // Limit reconnection attempts
    //                 reconnectionDelay: 1000, // Delay between attempts
    //             });

    //             this.setupEventListeners();
                
    //             this.socket.on('connect', () => {
    //                 console.log('Socket connected:', this.socket.id);
    //                 this.isConnected = true;
    //                 this.reconnectAttempts = 0;
    //                 appState.setConnectionStatus(true);
    //                 resolve();
    //             });

    //             this.socket.on('connect_error', (error) => {
    //                 console.error('Socket connection error:', error);
    //                 this.isConnected = false;
    //                 appState.setConnectionStatus(false);
    //                 reject(error);
    //             });

    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }

    connect() {
        if (!this.token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Connecting to socket with token:', this.token);

        try {
            console.log('socket link', API_CONFIG.SOCKET_URL, this.token);
            this.socket = io(API_CONFIG.SOCKET_URL, {
                auth: { token: JSON.parse(this.token) },
                transports: ['websocket', 'polling'], // fallback options
                reconnection: true,                  // Enable built-in reconnection
                reconnectionAttempts: 5,             // Limit reconnection attempts
                reconnectionDelay: 1000,             // Delay between attempts
            });

            this.setupEventListeners();

            this.socket.on('connect', () => {
                console.log('Socket connected:', this.socket.id);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                appState.setConnectionStatus(true);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error.message);
                this.isConnected = false;
                appState.setConnectionStatus(false);
            });

        } catch (error) {
            console.error("Socket connection failed:", error);
        }
    }


    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            appState.setConnectionStatus(false);
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    setupEventListeners() {
        // Connection events
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            appState.setConnectionStatus(false);
            
            if (reason === 'io server disconnect') {
                // Server disconnected, try to reconnect
                this.handleReconnection();
            }
        });

        // Message events
        // this.socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message) => {
        //     const currentUser = localStorage.getItem(STORAGE_KEYS.USER_DATA)? JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA)) : null;

        //     if (message.sender_user_id !== currentUser.user_id) { 
        //         appState.addMessage(message);                           //------------------------------------------------------
        //         this.playNotificationSound(message);
        //         return;
        //     }
        //     console.log("MESSAGE_NEW", message,appState.getState().currentChat.id);
        //     if (message.chat_id === appState.getState().currentChat.id) {
        //         this.socket.emit(SOCKET_EVENTS.RECEIPT_DELIVERED, { messageId: message.id }, (response) => {
        //             if (response?.ok) {
        //                 appState.updateMessage(message.id, { 
        //                     status: 'delivered',
        //                     deliveredAt: response.at,
        //                     deliveredBy: currentUser.user_id 
        //                 });
        //             }
        //         });
        //     }
        // });
        this.socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message) => {
            const currentUser = localStorage.getItem(STORAGE_KEYS.USER_DATA)
                ? JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA))
                : null;

            // Message from someone else
            if (message.sender_user_id !== currentUser.user_id) { 
                appState.addMessage(message);
                this.playNotificationSound(message);

                // console.log("MESSAGE_NEW (other user)", message, appState.getState().currentChat.id);
                // If this chat is currently open, mark as delivered
                if (message.chat_id === appState.getState().currentChat?.id) {
                    this.markRead(message.id)
                }

                return; // done
            }

            // Message from current user (just log/debug)
            console.log("MESSAGE_NEW (own message)", message, appState.getState().currentChat.id);
        });


        // Receipt events
        this.socket.on(SOCKET_EVENTS.RECEIPT_DELIVERED_RECEIVED, ({ messageId, byUserId, at }) => {
            console.log("RECEIPT_DELIVERED_RECEIVED", messageId, byUserId, at);
            appState.updateMessage(messageId, { 
                status: 'delivered',
                deliveredAt: at,
                deliveredBy: byUserId 
            });
        });

        this.socket.on(SOCKET_EVENTS.RECEIPT_READ_RECEIVED, ({ messageId, byUserId, at }) => {
            console.log("RECEIPT_READ_RECEIVED::", messageId, byUserId, at);
            appState.updateMessage(messageId, { 
                status: 'read',
                readAt: at,
                readBy: byUserId 
            });
        });

        // Batch read receipts
        this.socket.on(SOCKET_EVENTS.CHAT_READ_UP_TO_RECEIVED, ({ chatId, byUserId, uptoSeq }) => {
            const messages = appState.getMessages(chatId);
            console.log("uptoseq",uptoSeq)
            messages.forEach(message => {
                if (message.seq <= uptoSeq && message.sender_user_id !== byUserId) {
                    appState.updateMessage(message.id, { 
                        status: 'read',
                        readAt: new Date().toISOString(),
                        readBy: byUserId 
                    });
                }
            });
        });

        this.socket.on(SOCKET_EVENTS.USER_ONLINE, ({ userId }) => {
            const userChats = appState.getState().chats;
            console.log("USER_ONLINE", userId, userChats);
            // const userChatsSet = new Set(userChats);
            // const messages = appState.getMessages(chatId);
            userChats.forEach(chat => {
                // if that user is a member of the chat mark all messages as deliverd ..........
                if(this._isAChatMember(chat, userId)){
                    const messages = appState.getMessages(chat.id);
                    const sendingMessages = messages.filter(message => message.status === 'sending')
                    // console.log("uptoseq",uptoSeq)
                    sendingMessages.forEach(message => {
                        // if (message.seq <= uptoSeq && message.sender_user_id !== byUserId) {
                            appState.updateMessage(message.id, { 
                                status: 'delivered',
                                readAt: new Date().toISOString(),
                                readBy: userId 
                            });
                        // }
                    });
                }
            });
        
        });

        // Typing indicators
        this.socket.on(SOCKET_EVENTS.TYPING_RECEIVED, ({ chatId, userId, isTyping }) => {
            appState.setTyping(chatId, userId, isTyping);
        });
    }

    _isAChatMember(chat, userId) {
        if((chat.members?.length === 2 &&
            chat.members?.find(p => p.id === parseInt(userId)) !== undefined )|| 
            chat.contactId === participantId) {
            return true;
        }else{
            return false;
        }
    }

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Maximum reconnection attempts reached');
            return;
        }

        setTimeout(() => {
            this.reconnectAttempts++;
            // this.connect().catch(() => {
            //     this.handleReconnection();
            // });
            this.connect();
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }

    // Message operations
    sendMessage(messageData) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit(SOCKET_EVENTS.MESSAGE_SEND, messageData, (response) => {
                if (response?.ok) {
                    resolve(response.message);
                } else {
                    reject(new Error(response?.error || 'Failed to send message'));
                }
            });
        });
    }

    markDelivered(messageId) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit(SOCKET_EVENTS.RECEIPT_DELIVERED, { messageId }, (response) => {
                if (response?.ok) {
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to mark as delivered'));
                }
            });
        });
    }

    markRead(messageId) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit(SOCKET_EVENTS.RECEIPT_READ, { messageId }, (response) => {
                if (response?.ok) {
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to mark as read'));
                }
            });
        });
    }

    markChatReadUpTo(chatId, uptoSeq) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit(SOCKET_EVENTS.CHAT_READ_UP_TO, { chatId, uptoSeq }, (response) => {
                if (response?.ok) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Failed to mark chat as read'));
                }
            });
        });
    }

    // Typing indicators
    sendTyping(chatId, isTyping) {
        if (this.isConnected) {
            this.socket.emit(SOCKET_EVENTS.TYPING, { chatId, isTyping });
        }
    }

    // Chat room management
    joinChat(chatId) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit(SOCKET_EVENTS.CHAT_JOIN, { chatId }, (response) => {
                if (response?.ok) {
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to join chat'));
                }
            });
        });
    }

    leaveChat(chatId) {
        if (this.isConnected) {
            this.socket.emit(SOCKET_EVENTS.CHAT_LEAVE, { chatId });
        }
    }

    playNotificationSound(message) {
        const currentUser = appState.getState().user;
        if (message.sender_user_id !== currentUser?.id && appState.getSetting('soundEnabled')) {
            const audio = new Audio('/assets/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Silently fail if sound can't play
        }
    }
}

export const socketClient = new SocketClient();
export default socketClient;
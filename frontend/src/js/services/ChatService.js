import { apiClient } from './ApiClient.js';
import { socketClient } from './SocketClient.js';
import { appState } from '../store/AppState.js';
import { handleError, formatTime } from '../utils/helpers.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing chats and chat-related operations
 */
class ChatService {
    constructor() {
        this.loadingChats = new Set();
    }

    async loadUserChats() {
        try {
            const currentUser = appState.getState().user;
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            const chats = await apiClient.getUserChats(currentUser.user_id);
            const ChatsWithUnreadCount = [];
            for (const chat of chats) {
                try {
                    const countData = await apiClient.getChatUnreadCount(chat.id, currentUser.user_id);
                    ChatsWithUnreadCount.push({
                        ...chat,
                        unreadCount: countData || 0
                    });
                    console.log("unreadCount", countData)
                } catch (err) {
                    console.error(`Error fetching unread count for chat ${chat.id}:`, err);
                    ChatsWithUnreadCount.push({
                        ...chat,
                        unreadCount: 0
                    });
                }
            }
            console.log("ChatsWithUnreadCount", ChatsWithUnreadCount)
            const processedChats = ChatsWithUnreadCount.map(chat => this.processChat(chat));
            appState.setChats(processedChats);
            
            return processedChats;
        } catch (error) {
            console.error('Error loading chats:', error);
            throw error;
        }
    }

    async createChat(user, chatName = null) {
        try {
            const currentUser = appState.getState().user;
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            // Check if chat already exists between these users
            const existingChat = this.findExistingDirectChat(user.id); 
            if (existingChat) {
                return existingChat;
            }

            // const chatData = {
            //     participants: [currentUser.user_id, user.id],
            //     type: 'direct',
            //     name: chatName
            // };
            const chatId = uuidv4();
            const chatData = {
                type: 'direct',
                id: chatId,
                contactId: user.id,
                name: user.name,
                profile_picture: user.profile_picture,
                lastMessage: 'Start a conversation',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                unreadCount: 0,
                isGroup: false,
                is_active: user.is_active,
                last_seen_at: user.last_seen_at,
                messages: []
            }
            
            // const newChat = await apiClient.createChat(chatData);
            // const processedChat = this.processChat(newChat);
            const processedChat = this.processChat(chatData);
            appState.addChat(processedChat);
            
            // Join the socket room
            // await socketClient.joinChat(newChat.id);
            
            return processedChat;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    }

    async loadChatMessages(chatId, options = {}) {
        try {
            // if (!this.loadingChats.has(chatId)) {
            //     this.loadingChats.add(chatId);
            //     console.log("loading chat messages for chatId:", chatId)
            //     return; // Already loading
            // }
            
            
            const {data} = await apiClient.getChatMessages(chatId, options);
            const messages = data
            const processedMessages = messages.map(msg => this.processMessage(msg));

            appState.setMessages(chatId, processedMessages);
            console.log('Fetched messages:', appState.getMessages(chatId));
            
            // Mark messages as delivered
            this.markMessagesAsRead(processedMessages);
            
            return processedMessages;
        } catch (error) {
            console.error('Error loading messages:', error);
            throw error;
        } finally {
            this.loadingChats.delete(chatId);
        }
    }

    async sendMessage(chatId, messageType, content, metadata) {
        const currentChat = appState.getState().chats.find(c => c.id === chatId);
        try {
            const currentUser = appState.getState().user;
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            // Create temporary message for immediate UI feedback
            const tempMessage = this.createTempMessage(chatId, messageType, content, currentUser);
            console.log("tempMessage",tempMessage)
            appState.addMessage(tempMessage);


            // Send via socket for real-time delivery
            const messageData = {
                chatId,
                messageType,
                body: content,
                metadata
            };

            try {
                const sentMessage = await socketClient.sendMessage(messageData);

                console.log('Message sent via socket:', sentMessage);
                // Update temp message with real data
                appState.updateMessage(tempMessage.id, {
                    ...sentMessage,
                    // status: 'sent'
                });
                // return messageData;
                return sentMessage;
            } catch (socketError) {
                // If socket fails, try HTTP as fallback
                console.warn('Socket send failed, trying HTTP fallback:', socketError);
                
                const sentMessage = await apiClient.sendMessage(messageData);
                appState.updateMessage(tempMessage.id, {
                    ...sentMessage,
                    // status: 'sent'
                });
                return sentMessage;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async markChatAsRead(chatId) {
        try {
            console.log("same chatId:",chatId)
            const messages = appState.getMessages(chatId);
            // const {data} = await apiClient.getChatMessages(chatId);
            // const messages = data;
            // console.log('Marking chat as read, messages:', messages);
            const unreadMessages = messages.filter(msg => 
                msg.sender_user_id !== appState.getState().user?.user_id && 
                msg.status !== 'read'
            );

            if (unreadMessages.length === 0) return;

            const lastMessage = messages[messages.length - 1];
            console.log("lastMessage",lastMessage)
            if (lastMessage && lastMessage.seq) {
                await socketClient.markChatReadUpTo(chatId, lastMessage.seq);
            }
            console.trace("lastMessage",lastMessage)

            // Mark individual messages as read locally
            unreadMessages.forEach(msg => {
                socketClient.markRead(msg.id).catch(console.error);
            });
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }

    sendTyping(chatId, isTyping) {
        socketClient.sendTyping(chatId, isTyping);
    }

    // Helper methods
    processChat(chat) {
        const currentUser = appState.getState().user;
        
        // For direct chats, set display name as the other participant's name
        if (chat.type === 'direct' && chat.name) {
            // const otherParticipant = chat.name;
            // if (otherParticipant) {
                chat.displayName = chat.name;
                chat.avatar = chat.profile_picture;
                chat.otherUser = chat;
            // }
        } else {
            chat.displayName = chat.name;
        }

        // Add computed properties
        chat.lastMessageTime = chat.last_message ? formatTime(chat.last_message.created_at) : '';
        chat.unreadCount = chat.unreadCount || 0;
        
        return chat;
    }

    processMessage(message) {
        const currentUser = appState.getState().user;
        // console.log("currentUser", currentUser, message.sender_user_id)
        
        return {
            ...message,
            isOwn: message.sender_user_id === currentUser?.user_id,
            timestamp: formatTime(message.created_at),
            status: message.status || 'sent'
        };
    }

    createTempMessage(chatId, messageType, content, user) {
        return {
            id: `temp_${Date.now()}_${Math.random()}`,
            chat_id: chatId,
            sender_user_id: user.user_id,
            message_type: messageType,
            body: content,
            created_at: new Date().toISOString(),
            status: 'sending',
            isOwn: true,
            isTemp: true
        };
    }

    findExistingDirectChat(participantId) {
        const currentUser = appState.getState().user;
        const chats = appState.getState().chats;
        console.log("here", chats,parseInt(participantId), parseInt( currentUser?.user_id))
        
        return chats.find(chat => 
            // chat.members && 
            (chat.members?.length === 2 &&
            chat.members?.find(p => p.id === parseInt(participantId)) !== undefined &&
            chat.members?.find(p => p.id === parseInt( currentUser?.user_id)) !== undefined) || 
            chat.contactId === participantId
        );
    }

    async markMessagesAsRead(messages) {
        const currentUser = appState.getState().user;
        
        const undeliveredMessages = messages.filter(msg => 
            msg.sender_user_id !== currentUser?.user_id && 
            msg.status === 'sent'
        );

        for (const message of undeliveredMessages) {
            try {
                await socketClient.markRead(message.id);
            } catch (error) {
                console.error('Error marking message as delivered:', error);
            }
        }
    }

    getChatParticipants(chat) {
        return chat.participants || [];
    }

    getOtherParticipant(chat) {
        const currentUser = appState.getState().user;
        if (!chat.participants || !currentUser) return null;
        
        return chat.participants.find(p => p.id !== currentUser.user_id);
    }

    formatLastMessage(chat) {
        if (!chat.last_message) return 'No messages yet';
        
        const message = chat.last_message;
        const currentUser = appState.getState().user;
        const isOwn = message.sender_user_id === currentUser?.user_id;
        
        let prefix = isOwn ? 'You: ' : '';
        
        switch (message.message_type) {
            case 'text':
                return prefix + (message.body || '');
            case 'voice':
                return prefix + '🎙️ Voice message';
            case 'image':
                return prefix + '📷 Image';
            case 'file':
                return prefix + '📎 File';
            default:
                return prefix + 'Message';
        }
    }
}

export const chatService = new ChatService();
export default chatService;
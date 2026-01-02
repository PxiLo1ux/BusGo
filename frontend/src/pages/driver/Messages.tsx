import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ChevronLeft, Loader2, Search, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { chatApi } from '../../services/api';

interface ChatPreview {
    participantId: string;
    participantName: string;
    bookings: string[];
    lastMessage: string;
    lastMessageTime: string;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    isDriver: boolean;
    createdAt: string;
    bookingId?: string;
    route?: string;
}

interface MergedChatDetails {
    participantName: string;
    messages: Message[];
}

export default function DriverMessages() {
    const [searchParams] = useSearchParams();
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [selectedChat, setSelectedChat] = useState<MergedChatDetails | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadChats();
        const bookingId = searchParams.get('booking');
        if (bookingId) {
            // If coming from a specific booking, load that chat
            loadChatByBooking(bookingId);
        }

        // Realtime polling - refresh chats every 5 seconds
        const interval = setInterval(() => {
            loadChats();
        }, 5000);

        return () => clearInterval(interval);
    }, [searchParams]);

    // Poll for new messages in selected chat
    useEffect(() => {
        if (!selectedParticipantId) return;

        const interval = setInterval(() => {
            loadMergedChat(selectedParticipantId);
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedParticipantId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedChat?.messages]);

    const loadChats = async () => {
        try {
            const res = await chatApi.getChats();
            setChats(res.data.chats || []);
        } catch (err) {
            console.error('Failed to load chats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadChatByBooking = async (bookingId: string) => {
        try {
            // First get messages to find participant
            const res = await chatApi.getMessages(bookingId);
            if (res.data.booking) {
                // For merged view, we need participant ID - but for single booking, use this
                setSelectedChat({
                    participantName: res.data.booking.passengerName || 'Passenger',
                    messages: res.data.messages || []
                });
                setSelectedBookingIds([bookingId]);
            }
        } catch (err) {
            console.error('Failed to load chat:', err);
        }
    };

    const loadMergedChat = async (participantId: string) => {
        try {
            const res = await chatApi.getMergedChat(participantId);
            setSelectedChat({
                participantName: res.data.participantName,
                messages: res.data.messages || []
            });
        } catch (err) {
            console.error('Failed to load merged chat:', err);
        }
    };

    const handleSelectChat = async (chat: ChatPreview) => {
        setSelectedParticipantId(chat.participantId);
        setSelectedBookingIds(chat.bookings);
        await loadMergedChat(chat.participantId);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || selectedBookingIds.length === 0) return;

        const messageContent = newMessage.trim();
        // Clear input immediately
        setNewMessage('');
        setIsSending(true);

        // Optimistic update - add message immediately
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            content: messageContent,
            senderName: 'You',
            senderId: 'driver',
            isDriver: true,
            createdAt: new Date().toISOString()
        };
        setSelectedChat(prev => prev ? {
            ...prev,
            messages: [...prev.messages, optimisticMessage]
        } : null);

        try {
            // Use first booking for sending (they all go to same passenger)
            await chatApi.sendMessage(selectedBookingIds[0], messageContent);
            // Reload to get real message
            if (selectedParticipantId) {
                await loadMergedChat(selectedParticipantId);
            }
            loadChats();
        } catch (err) {
            // Remove optimistic message on error
            setSelectedChat(prev => prev ? {
                ...prev,
                messages: prev.messages.filter(m => m.id !== optimisticMessage.id)
            } : null);
            console.error('Failed to send message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const filteredChats = chats.filter(c =>
        c.participantName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-display font-bold text-white mb-1">Messages</h1>
                <p className="text-slate-400">Chat with passengers about their bookings</p>
            </div>

            <div className="glass rounded-2xl h-[calc(100vh-16rem)] overflow-hidden flex">
                {/* Chat List */}
                <div className={`w-full md:w-80 border-r border-white/10 flex flex-col ${selectedChat ? 'hidden md:flex' : ''}`}>
                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredChats.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No conversations yet</p>
                            </div>
                        ) : filteredChats.map(chat => (
                            <button
                                key={chat.participantId}
                                onClick={() => handleSelectChat(chat)}
                                className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${selectedParticipantId === chat.participantId ? 'bg-primary-500/10' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {chat.participantName?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-medium truncate">{chat.participantName || 'Passenger'}</span>
                                            <span className="text-slate-500 text-xs">{formatTime(chat.lastMessageTime)}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm truncate">{chat.lastMessage}</p>
                                        <p className="text-slate-500 text-xs mt-1">{chat.bookings.length} booking{chat.bookings.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : ''}`}>
                    {selectedChat ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { setSelectedChat(null); setSelectedParticipantId(null); setSelectedBookingIds([]); }}
                                        className="md:hidden p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                                    </button>
                                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{selectedChat.participantName || 'Passenger'}</p>
                                        <p className="text-slate-400 text-sm">{selectedBookingIds.length} booking{selectedBookingIds.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedChat.messages.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <p>No messages yet. Start the conversation!</p>
                                    </div>
                                ) : selectedChat.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isDriver ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${msg.isDriver
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-slate-700 text-white'
                                            }`}>
                                            {msg.route && <p className="text-xs mb-1 opacity-70">{msg.route}</p>}
                                            <p>{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.isDriver ? 'text-primary-200' : 'text-slate-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-white/10">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type your message..."
                                        className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || isSending}
                                        className="px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl disabled:opacity-50"
                                    >
                                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">Select a Conversation</h3>
                                <p className="text-slate-400">Choose a chat from the list to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2, Bus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supportApi, chatApi } from '../../services/api';

interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

interface DriverChat {
    bookingId: string;
    otherPartyName: string;
    route: string;
    lastMessage: string;
    lastMessageTime: string;
}

export default function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'menu' | 'support' | 'driver'>('menu');
    const [driverChats, setDriverChats] = useState<DriverChat[]>([]);
    const [selectedDriverChat, setSelectedDriverChat] = useState<DriverChat | null>(null);
    const [driverMessages, setDriverMessages] = useState<Array<{ id: string; content: string; senderName: string; isDriver: boolean; createdAt: string }>>([]);

    // Support chat state
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', content: 'Hello! How can we help you today?', isUser: false, timestamp: new Date() }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, driverMessages]);

    // Load existing support ticket
    useEffect(() => {
        if (isOpen && user && mode === 'support' && !isInitialized) {
            loadOrCreateTicket();
        }
    }, [isOpen, user, mode, isInitialized]);

    // Load driver chats when mode changes
    useEffect(() => {
        if (isOpen && user && mode === 'menu') {
            loadDriverChats();
        }
    }, [isOpen, user, mode]);

    // Poll for driver messages when in driver chat
    useEffect(() => {
        if (mode !== 'driver' || !selectedDriverChat) return;

        const pollMessages = async () => {
            try {
                const res = await chatApi.getMessages(selectedDriverChat.bookingId);
                setDriverMessages(res.data.messages || []);
            } catch (err) {
                console.error('Failed to poll driver messages', err);
            }
        };

        const interval = setInterval(pollMessages, 3000);
        return () => clearInterval(interval);
    }, [mode, selectedDriverChat]);

    const loadDriverChats = async () => {
        try {
            const res = await chatApi.getChats();
            setDriverChats(res.data.chats || []);
        } catch (err) {
            console.error('Failed to load driver chats', err);
        }
    };

    const openDriverChat = async (chat: DriverChat) => {
        setSelectedDriverChat(chat);
        setMode('driver');
        try {
            const res = await chatApi.getMessages(chat.bookingId);
            setDriverMessages(res.data.messages || []);
        } catch (err) {
            console.error('Failed to load driver messages', err);
        }
    };

    const sendDriverMessage = async () => {
        if (!selectedDriverChat || !newMessage.trim()) return;

        const messageContent = newMessage.trim();
        // Clear input immediately
        setNewMessage('');
        setIsSending(true);

        // Optimistic update
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            content: messageContent,
            senderName: 'You',
            isDriver: false,
            createdAt: new Date().toISOString()
        };
        setDriverMessages(prev => [...prev, optimisticMessage]);

        try {
            const res = await chatApi.sendMessage(selectedDriverChat.bookingId, messageContent);
            // Replace optimistic with real message
            setDriverMessages(prev => prev.map(m =>
                m.id === optimisticMessage.id ? res.data.message : m
            ));
        } catch (err) {
            // Remove optimistic message on error
            setDriverMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            console.error('Failed to send driver message', err);
        } finally {
            setIsSending(false);
        }
    };

    const loadOrCreateTicket = async () => {
        try {
            const res = await supportApi.getMyTickets();
            const openTickets = res.data.tickets?.filter((t: any) => t.status === 'open' || t.status === 'in_progress') || [];

            if (openTickets.length > 0) {
                const ticketRes = await supportApi.getTicket(openTickets[0].id);
                setTicketId(openTickets[0].id);
                const ticket = ticketRes.data.ticket;
                const loadedMessages: Message[] = [
                    { id: 'init', content: `Ticket opened: ${ticket.description}`, isUser: true, timestamp: new Date(ticket.createdAt) },
                    ...ticket.messages.map((m: any) => ({
                        id: m.id, content: m.content, isUser: !m.isAdmin, timestamp: new Date(m.createdAt)
                    }))
                ];
                setMessages(loadedMessages);
            }
            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to load tickets:', err);
            setIsInitialized(true);
        }
    };

    const handleSendSupport = async () => {
        if (!newMessage.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), content: newMessage, isUser: true, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setNewMessage('');
        setIsSending(true);

        try {
            if (!ticketId) {
                const res = await supportApi.submitTicket({ email: user?.email || 'guest@busgo.com', category: 'other', description: newMessage, userId: user?.id });
                setTicketId(res.data.ticket.id);
                const botMsg: Message = { id: (Date.now() + 1).toString(), content: 'Thank you for contacting support! Your ticket has been created. An agent will respond shortly.', isUser: false, timestamp: new Date() };
                setMessages(prev => [...prev, botMsg]);
            } else {
                await supportApi.addMessage(ticketId, newMessage);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            const errorMsg: Message = { id: (Date.now() + 1).toString(), content: 'Failed to send message. Please try again.', isUser: false, timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsSending(false);
        }
    };

    if (!user || user.role !== 'PASSENGER') return null;

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button onClick={() => { setIsOpen(true); setMode('menu'); }}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50">
                    <MessageCircle className="w-6 h-6 text-white" />
                    {driverChats.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{driverChats.length}</span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] glass rounded-2xl flex flex-col shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {mode !== 'menu' && (
                                <button onClick={() => { setMode('menu'); setSelectedDriverChat(null); }} className="text-white/80 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                {mode === 'driver' ? <Bus className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                                <p className="text-white font-semibold">
                                    {mode === 'menu' ? 'Messages' : mode === 'support' ? 'Support Chat' : selectedDriverChat?.otherPartyName}
                                </p>
                                <p className="text-white/70 text-xs">
                                    {mode === 'menu' ? 'Choose a chat' : mode === 'support' ? (ticketId ? `Ticket: ${ticketId.slice(0, 8)}...` : 'Start a conversation') : selectedDriverChat?.route}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Menu Mode */}
                    {mode === 'menu' && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {/* Support Chat Option */}
                            <button
                                onClick={() => setMode('support')}
                                className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center gap-4 transition-colors"
                            >
                                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                    <MessageCircle className="w-6 h-6 text-primary-400" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-medium">Customer Support</p>
                                    <p className="text-slate-400 text-sm">Get help with your bookings</p>
                                </div>
                            </button>

                            {/* Driver Chats */}
                            {driverChats.length > 0 && (
                                <>
                                    <p className="text-slate-400 text-sm font-medium mt-4 mb-2">Driver Conversations</p>
                                    {driverChats.map(chat => (
                                        <button
                                            key={chat.bookingId}
                                            onClick={() => openDriverChat(chat)}
                                            className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center gap-4 transition-colors"
                                        >
                                            <div className="w-12 h-12 bg-secondary-500/20 rounded-xl flex items-center justify-center">
                                                <Bus className="w-6 h-6 text-secondary-400" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">{chat.otherPartyName}</p>
                                                <p className="text-slate-400 text-sm truncate">{chat.route}</p>
                                                {chat.lastMessage && (
                                                    <p className="text-slate-500 text-xs truncate">{chat.lastMessage.slice(0, 30)}...</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {driverChats.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Bus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No driver conversations yet</p>
                                    <p className="text-sm mt-1">Start a chat from your bookings</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Support Chat Mode */}
                    {mode === 'support' && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.isUser ? 'bg-primary-500 text-white' : 'bg-slate-700 text-white'}`}>
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.isUser ? 'text-primary-200' : 'text-slate-400'}`}>
                                                {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {isSending && (
                                    <div className="flex justify-start"><div className="bg-slate-700 p-3 rounded-2xl"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div></div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-3 border-t border-white/10">
                                <div className="flex gap-2">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendSupport()}
                                        placeholder="Type your message..."
                                        className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500" />
                                    <button onClick={handleSendSupport} disabled={!newMessage.trim() || isSending}
                                        className="px-3 py-2 bg-primary-500 text-white rounded-xl disabled:opacity-50">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Driver Chat Mode */}
                    {mode === 'driver' && selectedDriverChat && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {driverMessages.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No messages yet</p>
                                        <p className="text-sm mt-1">Start the conversation</p>
                                    </div>
                                ) : (
                                    driverMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.isDriver ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.isDriver ? 'bg-slate-700' : 'bg-primary-500'}`}>
                                                <p className="text-white text-sm">{msg.content}</p>
                                                <p className={`text-xs mt-1 ${msg.isDriver ? 'text-slate-400' : 'text-primary-200'}`}>
                                                    {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-3 border-t border-white/10">
                                <div className="flex gap-2">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendDriverMessage()}
                                        placeholder="Message driver..."
                                        className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500" />
                                    <button onClick={sendDriverMessage} disabled={!newMessage.trim() || isSending}
                                        className="px-3 py-2 bg-primary-500 text-white rounded-xl disabled:opacity-50">
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

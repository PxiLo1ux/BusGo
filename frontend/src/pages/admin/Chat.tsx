import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ChevronLeft, Loader2, Search, Clock, CheckCircle, AlertCircle, Users, Headphones, Bus, User } from 'lucide-react';
import { supportApi, chatApi } from '../../services/api';

interface Message {
    id: string;
    content: string;
    isAdmin: boolean;
    createdAt: string;
}

interface Ticket {
    id: string;
    email: string;
    category: string;
    description: string;
    status: string;
    createdAt: string;
    messages: Message[];
    user?: { name: string };
}

interface DriverPassengerChat {
    pairId: string;
    driverId: string;
    driverName: string;
    passengerId: string;
    passengerName: string;
    lastMessage: string;
    lastMessageTime: string;
}

interface ChatMessage {
    id: string;
    content: string;
    senderName: string;
    isDriver: boolean;
    createdAt: string;
    route?: string;
}

export default function Chat() {
    // Toggle between support and driver-passenger chats
    const [chatMode, setChatMode] = useState<'support' | 'driver-passenger'>('support');

    // Support ticket state
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Driver-Passenger chat state
    const [dpChats, setDpChats] = useState<DriverPassengerChat[]>([]);
    const [selectedDpChat, setSelectedDpChat] = useState<{ pairId: string; driverName: string; passengerName: string; messages: ChatMessage[] } | null>(null);

    useEffect(() => {
        if (chatMode === 'support') {
            loadTickets();
        } else {
            loadDriverPassengerChats();
        }
    }, [chatMode]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTicket?.messages, selectedDpChat?.messages]);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const res = await supportApi.getAllTickets();
            setTickets(res.data.tickets || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDriverPassengerChats = async () => {
        setIsLoading(true);
        try {
            const res = await chatApi.getAdminConversations();
            setDpChats(res.data.conversations || []);
        } catch (err) {
            console.error('Failed to load driver-passenger chats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectTicket = async (ticket: Ticket) => {
        try {
            const res = await supportApi.getTicket(ticket.id);
            setSelectedTicket(res.data.ticket);
        } catch (err) {
            console.error('Failed to load ticket:', err);
        }
    };

    const handleSelectDpChat = async (chat: DriverPassengerChat) => {
        try {
            const res = await chatApi.getAdminConversation(chat.pairId);
            setSelectedDpChat({
                pairId: chat.pairId,
                driverName: res.data.driverName,
                passengerName: res.data.passengerName,
                messages: res.data.messages || []
            });
        } catch (err) {
            console.error('Failed to load conversation:', err);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        setIsSending(true);
        try {
            await supportApi.addAdminMessage(selectedTicket.id, newMessage.trim());
            const res = await supportApi.getTicket(selectedTicket.id);
            setSelectedTicket(res.data.ticket);
            setNewMessage('');
            loadTickets();
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!selectedTicket) return;
        try {
            await supportApi.updateTicketStatus(selectedTicket.id, status);
            setSelectedTicket({ ...selectedTicket, status });
            loadTickets();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const filteredTickets = tickets.filter(t =>
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDpChats = dpChats.filter(c =>
        c.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.passengerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-yellow-500/20 text-yellow-400';
            case 'in_progress': return 'bg-blue-500/20 text-blue-400';
            case 'resolved': return 'bg-green-500/20 text-green-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="h-[calc(100vh-12rem)]">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white mb-1">
                        {chatMode === 'support' ? 'Support Tickets' : 'Driver-Passenger Chats'}
                    </h1>
                    <p className="text-slate-400">
                        {chatMode === 'support' ? 'Manage customer support conversations' : 'Monitor driver-passenger communications'}
                    </p>
                </div>

                {/* Toggle Buttons */}
                <div className="flex bg-slate-800 rounded-xl p-1">
                    <button
                        onClick={() => { setChatMode('support'); setSelectedTicket(null); setSelectedDpChat(null); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${chatMode === 'support' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Headphones className="w-4 h-4" /> Support
                    </button>
                    <button
                        onClick={() => { setChatMode('driver-passenger'); setSelectedTicket(null); setSelectedDpChat(null); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${chatMode === 'driver-passenger' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Users className="w-4 h-4" /> Driver-Passenger
                    </button>
                </div>
            </div>

            <div className="glass rounded-2xl h-full overflow-hidden flex">
                {/* List */}
                <div className={`w-full md:w-80 border-r border-white/10 flex flex-col ${(selectedTicket || selectedDpChat) ? 'hidden md:flex' : ''}`}>
                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={chatMode === 'support' ? 'Search tickets...' : 'Search conversations...'}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {chatMode === 'support' ? (
                            // Support Tickets List
                            filteredTickets.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">No tickets found</div>
                            ) : filteredTickets.map(ticket => (
                                <button key={ticket.id} onClick={() => handleSelectTicket(ticket)}
                                    className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-primary-500/10' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {(ticket.user?.name || ticket.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-medium truncate">{ticket.user?.name || ticket.email}</span>
                                                <span className="text-slate-500 text-xs">{formatTime(ticket.createdAt)}</span>
                                            </div>
                                            <p className="text-slate-400 text-sm truncate">{ticket.description}</p>
                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            // Driver-Passenger Chats List
                            filteredDpChats.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">No conversations found</div>
                            ) : filteredDpChats.map(chat => (
                                <button key={chat.pairId} onClick={() => handleSelectDpChat(chat)}
                                    className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${selectedDpChat?.pairId === chat.pairId ? 'bg-primary-500/10' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Users className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-medium truncate">{chat.driverName} ↔ {chat.passengerName}</span>
                                                <span className="text-slate-500 text-xs">{formatTime(chat.lastMessageTime)}</span>
                                            </div>
                                            <p className="text-slate-400 text-sm truncate">{chat.lastMessage}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col ${(!selectedTicket && !selectedDpChat) ? 'hidden md:flex' : ''}`}>
                    {chatMode === 'support' && selectedTicket ? (
                        <>
                            {/* Support Ticket Header */}
                            <div className="p-4 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedTicket(null)} className="md:hidden p-2 hover:bg-white/10 rounded-lg">
                                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                                        </button>
                                        <div>
                                            <p className="text-white font-medium">{selectedTicket.user?.name || selectedTicket.email}</p>
                                            <p className="text-slate-400 text-sm">Category: {selectedTicket.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStatusChange('in_progress')} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30">
                                            <Clock className="w-4 h-4 inline mr-1" />In Progress
                                        </button>
                                        <button onClick={() => handleStatusChange('resolved')} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30">
                                            <CheckCircle className="w-4 h-4 inline mr-1" />Resolve
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Original Issue */}
                            <div className="p-4 bg-slate-800/50 border-b border-white/10">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-slate-300 text-sm font-medium">Original Issue:</p>
                                        <p className="text-slate-400 text-sm">{selectedTicket.description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {(selectedTicket.messages || []).map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${msg.isAdmin ? 'bg-primary-500 text-white' : 'bg-slate-700 text-white'}`}>
                                            <p>{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.isAdmin ? 'text-primary-200' : 'text-slate-400'}`}>
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
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type your response..."
                                        className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500" />
                                    <button onClick={handleSend} disabled={!newMessage.trim() || isSending}
                                        className="px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl disabled:opacity-50">
                                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : chatMode === 'driver-passenger' && selectedDpChat ? (
                        <>
                            {/* Driver-Passenger Chat Header */}
                            <div className="p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedDpChat(null)} className="md:hidden p-2 hover:bg-white/10 rounded-lg">
                                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                                    </button>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                <Bus className="w-4 h-4 text-green-400" />
                                            </div>
                                            <span className="text-white font-medium">{selectedDpChat.driverName}</span>
                                        </div>
                                        <span className="text-slate-500">↔</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                <User className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <span className="text-white font-medium">{selectedDpChat.passengerName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Read-only messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedDpChat.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isDriver ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${msg.isDriver ? 'bg-green-500/20 text-white' : 'bg-blue-500/20 text-white'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-medium ${msg.isDriver ? 'text-green-400' : 'text-blue-400'}`}>
                                                    {msg.senderName}
                                                </span>
                                                {msg.route && <span className="text-xs text-slate-500">• {msg.route}</span>}
                                            </div>
                                            <p>{msg.content}</p>
                                            <p className="text-xs mt-1 text-slate-400">
                                                {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Read-only notice */}
                            <div className="p-4 border-t border-white/10 bg-slate-800/50">
                                <p className="text-center text-slate-500 text-sm">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    This is a read-only view of driver-passenger communication
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    {chatMode === 'support' ? 'Select a Ticket' : 'Select a Conversation'}
                                </h3>
                                <p className="text-slate-400">Choose from the list to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

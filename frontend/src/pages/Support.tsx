import { useState } from 'react';
import { HelpCircle, MessageCircle, Send, CheckCircle, AlertTriangle, Clock, Phone, Mail, MapPin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { supportApi } from '../services/api';

interface FAQItem { question: string; answer: string; }

const faqs: FAQItem[] = [
    { question: 'How can I cancel my booking?', answer: 'Go to "My Bookings" section, find your booking, and click the "Cancel" button. Cancellations made 24 hours before departure receive a full refund.' },
    { question: 'I didn\'t receive my booking confirmation', answer: 'Check your spam folder. If not found, go to "My Bookings" to verify your booking status. Contact support if the issue persists.' },
    { question: 'How do I change my seat selection?', answer: 'Currently, seat changes require cancelling and rebooking. We\'re working on a seat change feature. For urgent requests, contact support.' },
    { question: 'What payment methods are accepted?', answer: 'We accept Cash on Delivery (pay the driver) and online payments through eSewa, Khalti, and bank cards.' },
    { question: 'How do I earn loyalty points?', answer: 'You earn 1 point for every Rs. 100 spent on bookings. Points can be redeemed for discounts on future trips.' },
    { question: 'What if my bus is delayed or cancelled?', answer: 'In case of delays, drivers will notify you. For cancellations, you\'ll receive a full refund automatically within 3-5 business days.' },
];

const issueCategories = [
    { id: 'booking', label: 'Booking Issue', icon: Clock },
    { id: 'payment', label: 'Payment Problem', icon: AlertTriangle },
    { id: 'driver', label: 'Driver Complaint', icon: MessageCircle },
    { id: 'refund', label: 'Refund Request', icon: CheckCircle },
    { id: 'other', label: 'Other', icon: HelpCircle },
];

export default function Support() {
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [ticketId, setTicketId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await supportApi.submitTicket({
                email: email || user?.email || '',
                category: selectedCategory,
                description,
                userId: user?.id
            });
            setTicketId(res.data.ticket.id);
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pt-32 pb-16">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <HelpCircle className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-display font-bold text-white mb-4">How Can We Help?</h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">Get quick answers to common questions or submit a support request</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* FAQ Section */}
                        <div>
                            <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
                            <div className="space-y-4">
                                {faqs.map((faq, i) => (
                                    <div key={i} className="glass rounded-xl overflow-hidden">
                                        <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full p-4 flex items-center justify-between text-left">
                                            <span className="text-white font-medium">{faq.question}</span>
                                            {expandedFaq === i ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </button>
                                        {expandedFaq === i && <div className="px-4 pb-4"><p className="text-slate-400">{faq.answer}</p></div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Support Form */}
                        <div>
                            <h2 className="text-2xl font-semibold text-white mb-6">Submit a Request</h2>
                            {submitted ? (
                                <div className="glass rounded-2xl p-8 text-center">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Request Submitted!</h3>
                                    <p className="text-slate-400 mb-2">Ticket ID: <span className="text-primary-400 font-mono">{ticketId?.slice(0, 8)}</span></p>
                                    <p className="text-slate-400 mb-6">Our team will review your request and get back to you within 24 hours.</p>
                                    <button onClick={() => { setSubmitted(false); setSelectedCategory(''); setDescription(''); setTicketId(null); }}
                                        className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium">Submit Another Request</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6">
                                    {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-3">What's your issue about?</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {issueCategories.map(cat => (
                                                <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)}
                                                    className={`p-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-2 transition-all ${selectedCategory === cat.id ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'}`}>
                                                    <cat.icon className="w-5 h-5" />{cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {!user && (
                                        <div>
                                            <label className="block text-sm text-slate-300 mb-2">Your Email *</label>
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-2">Describe your issue *</label>
                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5}
                                            placeholder="Please provide details about your issue, including booking ID if applicable..."
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 resize-none" />
                                    </div>
                                    <button type="submit" disabled={!selectedCategory || !description || isSubmitting}
                                        className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </form>
                            )}
                            <div className="mt-8 glass rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Need Immediate Help?</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-primary-500" /><a href="tel:+9771234567890" className="text-slate-300 hover:text-primary-400">+977 1234567890</a></div>
                                    <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-primary-500" /><a href="mailto:support@busgo.com" className="text-slate-300 hover:text-primary-400">support@busgo.com</a></div>
                                    <div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-primary-500 mt-0.5" /><span className="text-slate-400">New Baneshwor, Kathmandu</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

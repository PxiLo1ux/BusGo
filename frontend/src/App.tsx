import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import SearchResults from './pages/SearchResults'
import SeatSelection from './pages/SeatSelection'
import Checkout from './pages/Checkout'
import BookingConfirmation from './pages/BookingConfirmation'
import MyBookings from './pages/MyBookings'
import Support from './pages/Support'
import Loyalty from './pages/Loyalty'
import Profile from './pages/Profile'
import Referrals from './pages/Referrals'
import Notifications from './pages/Notifications'
import ChatWidget from './components/common/ChatWidget'

// Driver pages
import DriverLayout from './pages/driver/DriverLayout'
import DriverDashboard from './pages/driver/Dashboard'
import DriverBuses from './pages/driver/BusManagement'
import DriverRoutes from './pages/driver/RouteManagement'
import DriverSchedules from './pages/driver/Scheduling'
import DriverProfile from './pages/driver/Profile'
import DriverBookings from './pages/driver/Bookings'
import DriverMessages from './pages/driver/Messages'
import DriverAnalytics from './pages/driver/Analytics'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import DriverManagement from './pages/admin/DriverManagement'
import DriverDetails from './pages/admin/DriverDetails'
import BusVerification from './pages/admin/BusVerification'
import BusTracking from './pages/admin/BusTracking'
import Reports from './pages/admin/Reports'
import DynamicPricing from './pages/admin/DynamicPricing'
import AdminChat from './pages/admin/Chat'
import LoyaltyOffers from './pages/admin/LoyaltyOffers'

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/seats/:scheduleId" element={<SeatSelection />} />
                <Route path="/checkout/:scheduleId" element={<Checkout />} />
                <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmation />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/support" element={<Support />} />
                <Route path="/loyalty" element={<Loyalty />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/notifications" element={<Notifications />} />

                {/* Driver routes */}
                <Route path="/driver" element={<DriverLayout />}>
                    <Route index element={<DriverDashboard />} />
                    <Route path="analytics" element={<DriverAnalytics />} />
                    <Route path="buses" element={<DriverBuses />} />
                    <Route path="routes" element={<DriverRoutes />} />
                    <Route path="schedules" element={<DriverSchedules />} />
                    <Route path="bookings" element={<DriverBookings />} />
                    <Route path="messages" element={<DriverMessages />} />
                    <Route path="profile" element={<DriverProfile />} />
                </Route>

                {/* Admin routes */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="drivers" element={<DriverManagement />} />
                    <Route path="drivers/:driverId" element={<DriverDetails />} />
                    <Route path="buses" element={<BusVerification />} />
                    <Route path="tracking" element={<BusTracking />} />
                    <Route path="pricing" element={<DynamicPricing />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="chat" element={<AdminChat />} />
                    <Route path="loyalty-offers" element={<LoyaltyOffers />} />
                </Route>
            </Routes>
            <ChatWidget />
        </AuthProvider>
    )
}

export default App

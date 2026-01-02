import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Random helpers
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// Get date X days ago
const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
};

// Nepali names
const firstNames = ['Ram', 'Shyam', 'Hari', 'Krishna', 'Bishal', 'Santosh', 'Rajesh', 'Suresh', 'Anita', 'Sita', 'Gita', 'Mina', 'Sunita', 'Puja', 'Asha', 'Maya', 'Deepak', 'Prakash', 'Nabin', 'Bikash', 'Roshan', 'Suman', 'Kiran', 'Binod', 'Dipendra', 'Raju', 'Ganesh', 'Sarita', 'Rita', 'Kamala'];
const lastNames = ['Sharma', 'Thapa', 'Gurung', 'Magar', 'Tamang', 'Rai', 'Limbu', 'Shrestha', 'Adhikari', 'Karki', 'Poudel', 'Bhandari', 'KC', 'Lama', 'Ghimire', 'Basnet', 'Subedi', 'Pandey', 'Koirala', 'Nepal'];

// Popular bus company names in Nepal
const busCompanies = ['Nepal Yatayat', 'Sajha Bus', 'Green Line', 'Buddha Travel', 'Mountain Express', 'Himalayan Coach', 'Everest Deluxe', 'Sunrise Transport', 'Royal Nepal', 'Eastern Express', 'Western Bus', 'Bagmati Travels', 'Gandaki Express', 'Koshi Transport', 'Mechi Bus Service'];

// Nepal locations with coordinates
const locations = [
    { name: 'Kathmandu', district: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
    { name: 'Pokhara', district: 'Kaski', lat: 28.2096, lng: 83.9856 },
    { name: 'Chitwan', district: 'Chitwan', lat: 27.5291, lng: 84.3542 },
    { name: 'Lumbini', district: 'Rupandehi', lat: 27.4833, lng: 83.2667 },
    { name: 'Butwal', district: 'Rupandehi', lat: 27.7006, lng: 83.4483 },
    { name: 'Dharan', district: 'Sunsari', lat: 26.8065, lng: 87.2846 },
    { name: 'Biratnagar', district: 'Morang', lat: 26.4525, lng: 87.2718 },
    { name: 'Nepalgunj', district: 'Banke', lat: 28.0500, lng: 81.6167 },
    { name: 'Birtamod', district: 'Jhapa', lat: 26.6491, lng: 87.9934 },
    { name: 'Narayanghat', district: 'Chitwan', lat: 27.6974, lng: 84.4283 },
    { name: 'Hetauda', district: 'Makwanpur', lat: 27.4283, lng: 85.0322 },
    { name: 'Janakpur', district: 'Dhanusha', lat: 26.7288, lng: 85.9247 },
    { name: 'Bhaktapur', district: 'Bhaktapur', lat: 27.6710, lng: 85.4298 },
    { name: 'Lalitpur', district: 'Lalitpur', lat: 27.6588, lng: 85.3247 },
    { name: 'Damak', district: 'Jhapa', lat: 26.6667, lng: 87.7000 },
];

// Major routes (origin, destination, distance in km, estimated time in minutes, base fare)
const majorRoutes = [
    ['Kathmandu', 'Pokhara', 200, 360, 800],      // Most popular
    ['Pokhara', 'Kathmandu', 200, 360, 800],
    ['Kathmandu', 'Chitwan', 150, 300, 600],
    ['Chitwan', 'Kathmandu', 150, 300, 600],
    ['Kathmandu', 'Lumbini', 280, 480, 1000],
    ['Lumbini', 'Kathmandu', 280, 480, 1000],
    ['Pokhara', 'Chitwan', 150, 270, 500],
    ['Chitwan', 'Pokhara', 150, 270, 500],
    ['Pokhara', 'Butwal', 170, 300, 550],
    ['Butwal', 'Pokhara', 170, 300, 550],
    ['Kathmandu', 'Biratnagar', 400, 600, 1200],
    ['Biratnagar', 'Kathmandu', 400, 600, 1200],
    ['Kathmandu', 'Dharan', 380, 540, 1100],
    ['Dharan', 'Kathmandu', 380, 540, 1100],
    ['Dharan', 'Biratnagar', 40, 60, 150],
    ['Biratnagar', 'Dharan', 40, 60, 150],
    ['Kathmandu', 'Janakpur', 250, 420, 700],
    ['Janakpur', 'Kathmandu', 250, 420, 700],
    ['Kathmandu', 'Hetauda', 80, 150, 350],
    ['Hetauda', 'Kathmandu', 80, 150, 350],
    ['Kathmandu', 'Nepalgunj', 530, 720, 1500],
    ['Nepalgunj', 'Kathmandu', 530, 720, 1500],
    ['Pokhara', 'Lumbini', 180, 300, 600],
    ['Lumbini', 'Pokhara', 180, 300, 600],
    ['Butwal', 'Lumbini', 25, 45, 100],
    ['Lumbini', 'Butwal', 25, 45, 100],
    ['Kathmandu', 'Birtamod', 500, 660, 1400],
    ['Birtamod', 'Kathmandu', 500, 660, 1400],
];

// Common departure times for buses
const departureTimes = ['05:00', '06:00', '06:30', '07:00', '07:30', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

const busTypes = ['STANDARD', 'DELUXE', 'TOURIST'];
const amenitiesList = [['WiFi', 'AC'], ['WiFi', 'AC', 'Charging Ports'], ['AC', 'Reclining Seats'], ['WiFi', 'AC', 'TV', 'Charging Ports'], ['AC'], ['WiFi', 'AC', 'Blanket']];

async function main() {
    console.log('🌱 Starting comprehensive database seed...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.bookingChat.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.driverRating.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.busLocation.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.dailySchedule.deleteMany();
    await prisma.pricingRule.deleteMany();
    await prisma.bus.deleteMany();
    await prisma.route.deleteMany();
    await prisma.loyaltyTransaction.deleteMany();
    await prisma.loyaltyPoints.deleteMany();
    await prisma.loyaltyOffer.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Database cleared\n');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin
    await prisma.user.create({
        data: { email: 'admin@busgo.com', password: hashedPassword, name: 'System Admin', role: 'ADMIN', phone: '+977-9800000000' }
    });
    console.log('👑 Admin: admin@busgo.com');

    // Create locations
    for (const loc of locations) {
        await prisma.location.create({
            data: { name: loc.name, district: loc.district, latitude: loc.lat, longitude: loc.lng, usageCount: randomInt(20, 100) }
        });
    }
    console.log(`📍 Created ${locations.length} locations`);

    // Create routes
    const routes: any[] = [];
    for (const [origin, dest, distance, time, fare] of majorRoutes) {
        const originLoc = locations.find(l => l.name === origin)!;
        const destLoc = locations.find(l => l.name === dest)!;
        const route = await prisma.route.create({
            data: {
                origin: origin as string, destination: dest as string,
                distance: distance as number, estimatedTime: time as number, baseFare: fare as number,
                waypoints: [],
                originLat: originLoc.lat, originLng: originLoc.lng,
                destinationLat: destLoc.lat, destinationLng: destLoc.lng
            }
        });
        routes.push(route);
    }
    console.log(`🛣️  Created ${routes.length} routes`);

    // Create 50 drivers with varied fleet sizes
    const drivers: any[] = [];
    const allBuses: any[] = [];

    // Large operators (10 drivers with 5-10 buses)
    for (let i = 0; i < 10; i++) {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const user = await prisma.user.create({
            data: { email: `driver${i + 1}@busgo.com`, password: hashedPassword, name: `${firstName} ${lastName}`, role: 'DRIVER', phone: `+977-98${randomInt(10000000, 99999999)}` }
        });
        const driver = await prisma.driver.create({
            data: { userId: user.id, licenseNumber: `DL-${2018 + i}-${randomInt(1000, 9999)}`, phone: user.phone!, status: 'APPROVED', rating: randomFloat(4.0, 5.0), totalReviews: randomInt(50, 200) }
        });

        // 5-10 buses for large operators
        const numBuses = randomInt(5, 10);
        const primaryRoute = randomItem(routes);

        for (let b = 0; b < numBuses; b++) {
            const company = randomItem(busCompanies);
            const bus = await prisma.bus.create({
                data: {
                    driverId: driver.id, name: `${company} ${['Express', 'Deluxe', 'Super', 'Premium', 'Gold'][randomInt(0, 4)]} ${b + 1}`,
                    plateNumber: `BA ${randomInt(1, 9)} PA ${randomInt(1000, 9999)}`, capacity: [35, 40, 45, 50][randomInt(0, 3)],
                    type: randomItem(busTypes) as any, approved: true, amenities: randomItem(amenitiesList),
                    hasToilet: Math.random() > 0.5, rating: randomFloat(3.5, 5.0), totalReviews: randomInt(10, 100),
                    documentsVerified: true, primaryRouteId: primaryRoute.id,
                    createdAt: daysAgo(randomInt(30, 90))
                }
            });
            allBuses.push({ bus, driver, primaryRoute });
        }
        drivers.push({ user, driver, busCount: numBuses });
    }
    console.log(`🚗 Created 10 large operators (5-10 buses each)`);

    // Medium operators (15 drivers with 2-4 buses)
    for (let i = 10; i < 25; i++) {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const user = await prisma.user.create({
            data: { email: `driver${i + 1}@busgo.com`, password: hashedPassword, name: `${firstName} ${lastName}`, role: 'DRIVER', phone: `+977-98${randomInt(10000000, 99999999)}` }
        });
        const driver = await prisma.driver.create({
            data: { userId: user.id, licenseNumber: `DL-${2019 + (i % 5)}-${randomInt(1000, 9999)}`, phone: user.phone!, status: 'APPROVED', rating: randomFloat(3.5, 5.0), totalReviews: randomInt(20, 80) }
        });

        const numBuses = randomInt(2, 4);
        const primaryRoute = randomItem(routes);

        for (let b = 0; b < numBuses; b++) {
            const company = randomItem(busCompanies);
            const bus = await prisma.bus.create({
                data: {
                    driverId: driver.id, name: `${company} ${['Bus', 'Travel', 'Service'][randomInt(0, 2)]}`,
                    plateNumber: `BA ${randomInt(1, 9)} PA ${randomInt(1000, 9999)}`, capacity: [35, 40, 45][randomInt(0, 2)],
                    type: randomItem(busTypes) as any, approved: true, amenities: randomItem(amenitiesList),
                    hasToilet: Math.random() > 0.6, rating: randomFloat(3.0, 4.5), totalReviews: randomInt(5, 50),
                    documentsVerified: true, primaryRouteId: primaryRoute.id,
                    createdAt: daysAgo(randomInt(30, 60))
                }
            });
            allBuses.push({ bus, driver, primaryRoute });
        }
        drivers.push({ user, driver, busCount: numBuses });
    }
    console.log(`🚗 Created 15 medium operators (2-4 buses each)`);

    // Small operators (25 drivers with 1 bus)
    for (let i = 25; i < 50; i++) {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const user = await prisma.user.create({
            data: { email: `driver${i + 1}@busgo.com`, password: hashedPassword, name: `${firstName} ${lastName}`, role: 'DRIVER', phone: `+977-98${randomInt(10000000, 99999999)}` }
        });
        const driver = await prisma.driver.create({
            data: { userId: user.id, licenseNumber: `DL-${2020 + (i % 4)}-${randomInt(1000, 9999)}`, phone: user.phone!, status: 'APPROVED', rating: randomFloat(3.0, 4.5), totalReviews: randomInt(5, 30) }
        });

        const primaryRoute = randomItem(routes);
        const company = randomItem(busCompanies);
        const bus = await prisma.bus.create({
            data: {
                driverId: driver.id, name: `${company} ${lastName}`,
                plateNumber: `BA ${randomInt(1, 9)} PA ${randomInt(1000, 9999)}`, capacity: [35, 40][randomInt(0, 1)],
                type: 'STANDARD', approved: true, amenities: ['AC'],
                hasToilet: false, rating: randomFloat(3.0, 4.0), totalReviews: randomInt(0, 20),
                documentsVerified: true, primaryRouteId: primaryRoute.id,
                createdAt: daysAgo(randomInt(10, 45))
            }
        });
        allBuses.push({ bus, driver, primaryRoute });
        drivers.push({ user, driver, busCount: 1 });
    }
    console.log(`🚗 Created 25 small operators (1 bus each)`);
    console.log(`🚌 Total buses: ${allBuses.length}`);

    // Create daily schedules for each bus
    let dailyScheduleCount = 0;
    for (const { bus, primaryRoute } of allBuses) {
        // 1-3 daily schedules per bus
        const numDailySchedules = randomInt(1, 3);
        const usedTimes: string[] = [];

        for (let d = 0; d < numDailySchedules; d++) {
            let depTime: string;
            do {
                depTime = randomItem(departureTimes);
            } while (usedTimes.includes(depTime));
            usedTimes.push(depTime);

            const [depHour, depMin] = depTime.split(':').map(Number);
            const arrivalMinutes = depHour * 60 + depMin + primaryRoute.estimatedTime;
            const arrHour = Math.floor(arrivalMinutes / 60) % 24;
            const arrMin = arrivalMinutes % 60;
            const arrTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;

            await prisma.dailySchedule.create({
                data: {
                    busId: bus.id, routeId: primaryRoute.id,
                    departureTime: depTime, arrivalTime: arrTime,
                    price: primaryRoute.baseFare + randomInt(-100, 300),
                    isActive: Math.random() > 0.1, isReturnTrip: false
                }
            });
            dailyScheduleCount++;
        }
    }
    console.log(`📅 Created ${dailyScheduleCount} daily schedules`);

    // Create 200+ passengers with location preferences
    const passengers: any[] = [];
    const passengerRoutePrefs: Map<string, string[]> = new Map();

    for (let i = 0; i < 220; i++) {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const homeCity = randomItem(locations).name;

        const user = await prisma.user.create({
            data: {
                email: `passenger${i + 1}@example.com`, password: hashedPassword,
                name: `${firstName} ${lastName}`, role: 'PASSENGER',
                phone: `+977-98${randomInt(10000000, 99999999)}`,
                createdAt: daysAgo(randomInt(1, 60))
            }
        });
        passengers.push(user);

        // Assign 1-3 preferred routes based on home city
        const preferredRoutes = routes
            .filter(r => r.origin === homeCity || r.destination === homeCity)
            .slice(0, randomInt(1, 3))
            .map(r => r.id);

        if (preferredRoutes.length === 0) {
            preferredRoutes.push(randomItem(routes).id);
        }
        passengerRoutePrefs.set(user.id, preferredRoutes);

        // Create loyalty points for some
        if (Math.random() > 0.4) {
            const points = randomInt(50, 500);
            await prisma.loyaltyPoints.create({
                data: { userId: user.id, points, tier: points > 300 ? 'GOLD' : points > 150 ? 'SILVER' : 'BRONZE', totalEarned: points + randomInt(50, 200) }
            });
        }
    }
    console.log(`👥 Created ${passengers.length} passengers`);

    // Generate schedules and bookings for past 2 months
    console.log(`\n📊 Generating 2 months of trip history...`);

    let scheduleCount = 0;
    let bookingCount = 0;
    let reviewCount = 0;

    // For each day in the past 60 days + next 7 days
    for (let daysOffset = 60; daysOffset >= -7; daysOffset--) {
        const tripDate = daysAgo(daysOffset);
        const isPast = daysOffset > 0;

        // Get all active daily schedules
        const dailySchedules = await prisma.dailySchedule.findMany({
            where: { isActive: true },
            include: { bus: true, route: true }
        });

        // Create schedules for this day (sample 30-60% of daily schedules)
        const todaySchedules = dailySchedules
            .filter(() => Math.random() > (isPast ? 0.4 : 0.3))
            .slice(0, randomInt(20, 50));

        for (const ds of todaySchedules) {
            const [depHour, depMin] = ds.departureTime.split(':').map(Number);
            const [arrHour, arrMin] = ds.arrivalTime.split(':').map(Number);

            const departureTime = new Date(tripDate);
            departureTime.setHours(depHour, depMin, 0, 0);

            const arrivalTime = new Date(tripDate);
            arrivalTime.setHours(arrHour, arrMin, 0, 0);
            if (arrHour < depHour) arrivalTime.setDate(arrivalTime.getDate() + 1);

            const status = isPast ? (Math.random() > 0.05 ? 'COMPLETED' : 'CANCELLED') : 'SCHEDULED';

            const schedule = await prisma.schedule.create({
                data: {
                    busId: ds.busId, routeId: ds.routeId,
                    departureTime, arrivalTime,
                    price: ds.price, availableSeats: ds.bus.capacity,
                    status, recurring: false, recurringDays: [],
                    createdAt: new Date(departureTime.getTime() - randomInt(1, 14) * 24 * 60 * 60 * 1000)
                }
            });
            scheduleCount++;

            // Create bookings for past/today schedules
            if (status !== 'CANCELLED' && (isPast || daysOffset === 0)) {
                const numBookings = randomInt(2, 12);
                const usedSeats: string[] = [];

                for (let b = 0; b < numBookings; b++) {
                    // Prefer passengers who like this route
                    const eligiblePassengers = passengers.filter(p => {
                        const prefs = passengerRoutePrefs.get(p.id) || [];
                        return prefs.includes(ds.routeId) || Math.random() > 0.7;
                    });

                    const passenger = randomItem(eligiblePassengers.length > 0 ? eligiblePassengers : passengers);
                    const numSeats = randomInt(1, 3);
                    const seats: string[] = [];

                    for (let s = 0; s < numSeats; s++) {
                        let seat: string;
                        do {
                            seat = `${randomInt(1, 10)}${['A', 'B', 'C', 'D'][randomInt(0, 3)]}`;
                        } while (usedSeats.includes(seat));
                        usedSeats.push(seat);
                        seats.push(seat);
                    }

                    const totalAmount = ds.price * numSeats;
                    const bookingStatus = status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED';

                    const booking = await prisma.booking.create({
                        data: {
                            userId: passenger.id, scheduleId: schedule.id,
                            seats, totalAmount,
                            discountAmount: Math.random() > 0.8 ? Math.floor(totalAmount * 0.1) : 0,
                            loyaltyUsed: 0, status: bookingStatus,
                            paymentMethod: Math.random() > 0.5 ? 'ONLINE' : 'CASH',
                            passengerName: passenger.name, passengerEmail: passenger.email, passengerPhone: passenger.phone,
                            createdAt: new Date(departureTime.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000)
                        }
                    });
                    bookingCount++;

                    // Create payment
                    if (bookingStatus !== 'CANCELLED') {
                        await prisma.payment.create({
                            data: { bookingId: booking.id, amount: totalAmount, status: 'SUCCEEDED', method: booking.paymentMethod as any, createdAt: booking.createdAt }
                        });
                    }

                    // Create reviews for completed bookings (30% chance)
                    if (bookingStatus === 'COMPLETED' && Math.random() > 0.7) {
                        const rating = randomInt(3, 5);
                        const comments = [
                            'Great journey, very comfortable!', 'Driver was professional and on time.',
                            'Good value for money.', 'AC worked well, smooth ride.',
                            'Recommended!', 'Will travel again with this bus.',
                            'Clean bus, friendly staff.', 'Excellent service!',
                            'Arrived on time.', 'Comfortable seats.'
                        ];

                        await prisma.review.create({
                            data: {
                                userId: passenger.id, bookingId: booking.id, scheduleId: schedule.id,
                                rating, comment: randomItem(comments),
                                createdAt: new Date(arrivalTime.getTime() + randomInt(1, 48) * 60 * 60 * 1000)
                            }
                        });
                        reviewCount++;
                    }
                }
            }
        }

        // Progress indicator
        if ((60 - daysOffset) % 10 === 0) {
            process.stdout.write(`   Day ${60 - daysOffset}/67...\r`);
        }
    }

    console.log(`\n✅ Generated ${scheduleCount} schedules`);
    console.log(`✅ Generated ${bookingCount} bookings`);
    console.log(`✅ Generated ${reviewCount} reviews`);

    // Create loyalty offers
    const offers = [
        { name: '10% Off Next Trip', description: 'Get 10% off on your next booking', pointsCost: 100, discountPercent: 10, category: 'discount' },
        { name: '15% Off Deluxe', description: 'Special discount on deluxe buses', pointsCost: 150, discountPercent: 15, category: 'discount' },
        { name: 'Free Seat Upgrade', description: 'Upgrade to premium seat', pointsCost: 200, discountPercent: 0, category: 'upgrade' },
        { name: '20% Weekend Special', description: 'Weekend travel discount', pointsCost: 250, discountPercent: 20, category: 'special' }
    ];

    for (const offer of offers) {
        await prisma.loyaltyOffer.create({
            data: { ...offer, validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true }
        });
    }
    console.log(`🎁 Created ${offers.length} loyalty offers`);

    // ============ CREATE PRICING RULES ============
    console.log('\n📈 Creating pricing rules...');

    // Delete existing pricing rules
    await prisma.pricingRule.deleteMany();

    const pricingRulesData = [
        // Early bird discounts - applies when DEPARTURE is X+ days away from NOW
        // Example: minDaysBefore=3 means if booking for a trip 3+ days from now, discount applies
        {
            name: 'Early Bird - 3 Days Advance',
            routeId: null, // Applies to all routes
            type: 'EARLY_BIRD',
            multiplier: 0.95, // 5% discount
            minDaysBefore: 3, // Trip must be 3+ days away
            minHoursBefore: null,
            active: true
        },
        {
            name: 'Early Bird - 7 Days Advance',
            routeId: null,
            type: 'EARLY_BIRD',
            multiplier: 0.90, // 10% discount
            minDaysBefore: 7, // Trip must be 7+ days away
            minHoursBefore: null,
            active: true
        },
        {
            name: 'Early Bird - 14 Days Advance',
            routeId: null,
            type: 'EARLY_BIRD',
            multiplier: 0.85, // 15% discount
            minDaysBefore: 14,
            minHoursBefore: null,
            active: true
        },
        {
            name: 'Early Bird - 30 Days Advance',
            routeId: null,
            type: 'EARLY_BIRD',
            multiplier: 0.80, // 20% discount
            minDaysBefore: 30,
            minHoursBefore: null,
            active: true
        },
        // Surge pricing - applies when DEPARTURE is X hours or less away from NOW
        // Example: minHoursBefore=24 means if trip departs within 24 hours, surge applies
        {
            name: 'Last Minute - Within 24 Hours',
            routeId: null,
            type: 'SURGE',
            multiplier: 1.25, // 25% increase
            minDaysBefore: null,
            minHoursBefore: 24, // Trip departs in less than 24 hours
            active: true
        },
        {
            name: 'Last Minute - Within 6 Hours',
            routeId: null,
            type: 'SURGE',
            multiplier: 1.35, // 35% increase
            minDaysBefore: null,
            minHoursBefore: 6,
            active: true
        },
        {
            name: 'Last Minute - Within 2 Hours',
            routeId: null,
            type: 'SURGE',
            multiplier: 1.50, // 50% increase
            minDaysBefore: null,
            minHoursBefore: 2,
            active: true
        },
        // Seasonal (Festival season example)
        {
            name: 'Dashain Festival Surge',
            routeId: null,
            type: 'SEASONAL',
            multiplier: 1.30, // 30% increase during Dashain
            startDate: new Date('2025-10-01'),
            endDate: new Date('2025-10-15'),
            minDaysBefore: null,
            minHoursBefore: null,
            active: true
        },
        {
            name: 'Tihar Festival Surge',
            routeId: null,
            type: 'SEASONAL',
            multiplier: 1.25,
            startDate: new Date('2025-10-25'),
            endDate: new Date('2025-11-05'),
            minDaysBefore: null,
            minHoursBefore: null,
            active: true
        }
    ];

    for (const ruleData of pricingRulesData) {
        await prisma.pricingRule.create({
            data: {
                name: ruleData.name,
                routeId: ruleData.routeId,
                type: ruleData.type,
                multiplier: ruleData.multiplier,
                minDaysBefore: ruleData.minDaysBefore,
                minHoursBefore: ruleData.minHoursBefore,
                startDate: (ruleData as any).startDate || null,
                endDate: (ruleData as any).endDate || null,
                active: ruleData.active
            }
        });
    }
    console.log(`📈 Created ${pricingRulesData.length} pricing rules`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   👑 1 Admin: admin@busgo.com`);
    console.log(`   🚗 ${drivers.length} Drivers (10 large, 15 medium, 25 small operators)`);
    console.log(`   🚌 ${allBuses.length} Buses`);
    console.log(`   🛣️  ${routes.length} Routes`);
    console.log(`   📅 ${dailyScheduleCount} Daily Schedule Templates`);
    console.log(`   🎫 ${scheduleCount} Trip Schedules (2 months + 1 week)`);
    console.log(`   👥 ${passengers.length} Passengers`);
    console.log(`   📖 ${bookingCount} Bookings`);
    console.log(`   ⭐ ${reviewCount} Reviews`);
    console.log(`   📈 ${pricingRulesData.length} Pricing Rules`);
    console.log('\n   🔐 All accounts: password123');
    console.log('   📧 Drivers: driver1@busgo.com to driver50@busgo.com');
    console.log('   📧 Passengers: passenger1@example.com to passenger220@example.com');
}

main()
    .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });

import { Wifi, Tv, User, Droplet, Wind, Plug } from 'lucide-react';

interface SeatLayoutProps {
    capacity: number;
    hasToilet: boolean;
    hasWifi?: boolean;
    hasTV?: boolean;
    hasAC?: boolean;
    hasCharging?: boolean;
    busName?: string;
    selectedSeats?: string[];
    bookedSeats?: string[];
    onSeatClick?: (seatName: string) => void;
    showLegend?: boolean;
    interactive?: boolean;
}

interface SeatData {
    name: string;
    row: number;
    column: string;
    position: 'REGULAR' | 'BACK' | 'TOILET';
}

// Generate seat layout based on capacity
function generateSeatLayout(capacity: number, hasToilet: boolean): SeatData[] {
    const seats: SeatData[] = [];

    // Back row: 5 seats for most buses, 4 for small buses (< 25 capacity)
    const backRowSeats = capacity < 25 ? 4 : 5;
    const regularSeatsNeeded = capacity - backRowSeats;
    const regularRows = Math.ceil(regularSeatsNeeded / 4);

    let seatCount = 0;
    let currentRow = 1;

    // If bus has toilet, first row is different (3 seats + toilet)
    if (hasToilet) {
        seats.push({ name: '1A', row: 1, column: 'A', position: 'REGULAR' });
        seats.push({ name: '1B', row: 1, column: 'B', position: 'REGULAR' });
        seats.push({ name: '1C', row: 1, column: 'C', position: 'REGULAR' });
        seats.push({ name: 'WC', row: 1, column: 'D', position: 'TOILET' });
        seatCount = 3;
        currentRow = 2;
    }

    // Generate regular rows (4 seats per row)
    while (seatCount < regularSeatsNeeded && currentRow <= regularRows + 1) {
        for (const col of ['A', 'B', 'C', 'D']) {
            if (seatCount < regularSeatsNeeded) {
                seats.push({
                    name: `${currentRow}${col}`,
                    row: currentRow,
                    column: col,
                    position: 'REGULAR'
                });
                seatCount++;
            }
        }
        currentRow++;
    }

    // Back row seats
    const backRow = currentRow;
    for (let i = 1; i <= backRowSeats; i++) {
        seats.push({
            name: `B${i}`,
            row: backRow,
            column: `E${i}`,
            position: 'BACK'
        });
    }

    return seats;
}

export default function BusSeatLayout({
    capacity,
    hasToilet,
    hasWifi = true,
    hasTV = true,
    hasAC = true,
    hasCharging = true,
    busName,
    selectedSeats = [],
    bookedSeats = [],
    onSeatClick,
    showLegend = true,
    interactive = false
}: SeatLayoutProps) {
    const seats = generateSeatLayout(capacity, hasToilet);
    const regularSeats = seats.filter(s => s.position === 'REGULAR');
    const backSeats = seats.filter(s => s.position === 'BACK');
    const toiletSeat = seats.find(s => s.position === 'TOILET');
    const rows = [...new Set(regularSeats.map(s => s.row))].sort((a, b) => a - b);

    const getSeatClasses = (seat: SeatData) => {
        const base = 'w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-200';

        if (seat.position === 'TOILET') {
            return `${base} bg-blue-500/30 text-blue-300 border border-blue-500/50`;
        }

        if (bookedSeats.includes(seat.name)) {
            return `${base} bg-slate-700 text-slate-500 cursor-not-allowed`;
        }

        if (selectedSeats.includes(seat.name)) {
            return `${base} bg-primary-500 text-white ring-2 ring-primary-400 ring-offset-1 ring-offset-slate-900 ${interactive ? 'cursor-pointer hover:scale-105' : ''}`;
        }

        return `${base} bg-slate-600 text-slate-300 border border-slate-500 ${interactive ? 'cursor-pointer hover:bg-slate-500 hover:scale-105' : ''}`;
    };

    const handleSeatClick = (seat: SeatData) => {
        if (!interactive || !onSeatClick) return;
        if (seat.position === 'TOILET') return;
        if (bookedSeats.includes(seat.name)) return;
        onSeatClick(seat.name);
    };

    return (
        <div className="flex flex-col items-center">
            {/* Bus Container */}
            <div className="relative bg-slate-800/80 rounded-[2rem] p-4 border-2 border-slate-600 w-full max-w-[280px]">

                {/* Front Lights */}
                <div className="absolute -top-1.5 left-8 right-8 flex justify-between">
                    <div className="w-8 h-3 bg-yellow-400/80 rounded-b-lg shadow-lg shadow-yellow-400/50" />
                    <div className="w-8 h-3 bg-yellow-400/80 rounded-b-lg shadow-lg shadow-yellow-400/50" />
                </div>

                {/* Front Label */}
                <div className="text-center text-xs text-slate-500 font-medium mb-2">FRONT</div>

                {/* Driver Row - Driver on RIGHT side with amenities above */}
                <div className="flex justify-between items-start mb-2 px-2">
                    {/* Door Side Label (left) */}
                    <div className="flex flex-col items-center">
                        <div className="text-[8px] text-slate-500 writing-mode-vertical transform -rotate-180 h-12" style={{ writingMode: 'vertical-lr' }}>
                            DOOR
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Driver Section (right side) with amenities on top */}
                    <div className="flex flex-col items-center gap-1">
                        {/* Amenity Icons Row */}
                        <div className="flex items-center gap-1.5 mb-1">
                            {hasWifi && (
                                <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center" title="WiFi">
                                    <Wifi className="w-3 h-3 text-green-400" />
                                </div>
                            )}
                            {hasAC && (
                                <div className="w-5 h-5 bg-cyan-500/20 rounded flex items-center justify-center" title="AC">
                                    <Wind className="w-3 h-3 text-cyan-400" />
                                </div>
                            )}
                            {hasCharging && (
                                <div className="w-5 h-5 bg-yellow-500/20 rounded flex items-center justify-center" title="Charging">
                                    <Plug className="w-3 h-3 text-yellow-400" />
                                </div>
                            )}
                        </div>
                        {/* Driver Seat */}
                        <div className="w-11 h-11 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-primary-500/50">
                            <User className="w-6 h-6 text-primary-400" />
                        </div>
                        <span className="text-[8px] text-slate-400">DRIVER</span>
                    </div>
                </div>

                {/* Toilet behind driver (row 1, right side) - if present */}
                {hasToilet && (
                    <div className="flex justify-end px-2 mb-2">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/50">
                                <Droplet className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-[8px] text-blue-400">WC</span>
                        </div>
                    </div>
                )}

                {/* Separator Line with TV */}
                <div className="relative flex items-center my-3">
                    <div className="flex-1 h-px bg-slate-600" />
                    {hasTV && (
                        <div className="px-2 flex items-center gap-1 bg-slate-800">
                            <div className="w-8 h-5 bg-slate-700 rounded flex items-center justify-center border border-slate-500">
                                <Tv className="w-4 h-4 text-primary-400" />
                            </div>
                        </div>
                    )}
                    <div className="flex-1 h-px bg-slate-600" />
                </div>

                {/* Column Labels */}
                <div className="flex justify-center gap-1 mb-2 px-6">
                    <div className="flex gap-1">
                        <div className="w-8 text-center text-[8px] text-slate-500">A</div>
                        <div className="w-8 text-center text-[8px] text-slate-500">B</div>
                    </div>
                    <div className="w-4" /> {/* Aisle space */}
                    <div className="flex gap-1">
                        <div className="w-8 text-center text-[8px] text-slate-500">C</div>
                        <div className="w-8 text-center text-[8px] text-slate-500">D</div>
                    </div>
                </div>

                {/* Seat Rows */}
                <div className="space-y-1.5 px-2">
                    {rows.map((rowNum) => {
                        const rowSeats = regularSeats.filter(s => s.row === rowNum);
                        const leftSeats = rowSeats.filter(s => s.column === 'A' || s.column === 'B').sort((a, b) => a.column.localeCompare(b.column));
                        const rightSeats = rowSeats.filter(s => s.column === 'C' || s.column === 'D').sort((a, b) => a.column.localeCompare(b.column));

                        return (
                            <div key={rowNum} className="flex justify-center gap-1 items-center">
                                {/* Left Seats (A, B) */}
                                <div className="flex gap-1">
                                    {leftSeats.map((seat) => (
                                        <button
                                            key={seat.name}
                                            onClick={() => handleSeatClick(seat)}
                                            className={getSeatClasses(seat)}
                                            disabled={!interactive || bookedSeats.includes(seat.name)}
                                            title={seat.name}
                                        >
                                            {seat.name}
                                        </button>
                                    ))}
                                    {leftSeats.length < 2 && <div className="w-8 h-8" />}
                                </div>

                                {/* Aisle */}
                                <div className="w-4 flex justify-center">
                                    <div className="w-px h-6 bg-slate-600 opacity-50" />
                                </div>

                                {/* Right Seats (C, D) or Toilet */}
                                <div className="flex gap-1">
                                    {rightSeats.map((seat) => {
                                        // Check if this is the toilet position
                                        if (hasToilet && rowNum === 1 && seat.column === 'D') {
                                            return null; // Toilet is shown in amenities row
                                        }
                                        return (
                                            <button
                                                key={seat.name}
                                                onClick={() => handleSeatClick(seat)}
                                                className={getSeatClasses(seat)}
                                                disabled={!interactive || bookedSeats.includes(seat.name)}
                                                title={seat.name}
                                            >
                                                {seat.name}
                                            </button>
                                        );
                                    })}
                                    {rightSeats.length < 2 && <div className="w-8 h-8" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Back Row */}
                {backSeats.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-600">
                        <p className="text-center text-[8px] text-slate-500 mb-1.5">BACK ROW</p>
                        <div className="flex justify-center gap-1">
                            {backSeats.map((seat) => (
                                <button
                                    key={seat.name}
                                    onClick={() => handleSeatClick(seat)}
                                    className={getSeatClasses(seat)}
                                    disabled={!interactive || bookedSeats.includes(seat.name)}
                                    title={seat.name}
                                >
                                    {seat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Back Label */}
                <div className="text-center text-xs text-slate-500 font-medium mt-3">BACK</div>

                {/* Back Lights */}
                <div className="absolute -bottom-1.5 left-8 right-8 flex justify-between">
                    <div className="w-6 h-2 bg-red-500/80 rounded-t-lg shadow-lg shadow-red-500/30" />
                    <div className="w-6 h-2 bg-red-500/80 rounded-t-lg shadow-lg shadow-red-500/30" />
                </div>
            </div>

            {/* Bus Info */}
            {busName && (
                <p className="mt-3 text-sm font-medium text-white text-center">{busName}</p>
            )}
            <p className="text-xs text-slate-400 text-center mt-1">
                {capacity} seats • {backSeats.length} back row
            </p>

            {/* Legend */}
            {showLegend && (
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-slate-600 border border-slate-500" />
                        <span className="text-[10px] text-slate-400">Available</span>
                    </div>
                    {interactive && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-primary-500" />
                            <span className="text-[10px] text-slate-400">Selected</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-slate-700" />
                        <span className="text-[10px] text-slate-400">Booked</span>
                    </div>
                    {hasToilet && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-500/50" />
                            <span className="text-[10px] text-slate-400">Toilet</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

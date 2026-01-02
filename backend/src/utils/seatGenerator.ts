/**
 * Generate seats for a bus schedule based on bus capacity
 * Layout: 2 seats on each side (A,B | C,D) per row, with 5 seats at back (or 4 for smaller buses)
 */
export function generateSeatsForSchedule(scheduleId: string, capacity: number, hasToilet: boolean): Array<{
    scheduleId: string;
    name: string;
    row: number;
    column: string;
    position: string;
}> {
    const seats: Array<{
        scheduleId: string;
        name: string;
        row: number;
        column: string;
        position: string;
    }> = [];

    // Determine back row size: 5 seats for most buses, 4 for small buses (< 25 seats)
    const backRowSeats = capacity < 25 ? 4 : 5;

    // Regular seats = total capacity minus back row
    const regularSeatsNeeded = capacity - backRowSeats;

    // 4 seats per regular row (2 on each side: A,B and C,D)
    const regularRows = Math.ceil(regularSeatsNeeded / 4);

    let seatCount = 0;
    let currentRow = 1;

    // If bus has toilet, first row is different
    if (hasToilet) {
        // Row 1: 3 regular seats + toilet (instead of seat D)
        seats.push({ scheduleId, name: '1A', row: 1, column: 'A', position: 'REGULAR' });
        seats.push({ scheduleId, name: '1B', row: 1, column: 'B', position: 'REGULAR' });
        seats.push({ scheduleId, name: '1C', row: 1, column: 'C', position: 'REGULAR' });
        seats.push({ scheduleId, name: 'WC', row: 1, column: 'D', position: 'TOILET' });
        seatCount = 3; // Only 3 regular seats in this row
        currentRow = 2;
    }

    // Generate regular rows (4 seats per row: A, B, C, D)
    while (seatCount < regularSeatsNeeded && currentRow <= regularRows + 1) {
        const columns = ['A', 'B', 'C', 'D'];
        for (const col of columns) {
            if (seatCount < regularSeatsNeeded) {
                seats.push({
                    scheduleId,
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

    // Back row seats (B1, B2, B3, B4, B5 - spanning full width)
    const backRow = currentRow;
    for (let i = 1; i <= backRowSeats; i++) {
        seats.push({
            scheduleId,
            name: `B${i}`,
            row: backRow,
            column: `E${i}`, // Special columns for back row
            position: 'BACK'
        });
    }

    return seats;
}

/**
 * Check if seats already exist for a schedule to avoid duplicates
 */
export function validateSeatsForCapacity(seatsCount: number, busCapacity: number): boolean {
    return seatsCount === busCapacity;
}

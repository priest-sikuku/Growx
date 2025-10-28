# Mining System Update - Database-Backed Implementation

## Overview
The mining system has been completely overhauled to use database persistence instead of localStorage, ensuring data consistency across sessions and devices.

## Key Changes

### 1. Fixed Mining Reward
- **Old**: Random reward between 30-80 GX
- **New**: Fixed reward of **2.50 GX** per mine

### 2. Mining Interval
- **Old**: 2 hours (7200 seconds)
- **New**: **2.5 hours (9000 seconds)**

### 3. Total Supply Tracking
- **Max Supply**: 300,000 GX
- **Real-time tracking**: Remaining supply decreases with each mine
- **Display**: Shows remaining supply on dashboard in decreasing order
- **Protection**: Mining halts when supply is exhausted

### 4. Database Persistence

#### New Database Tables & Columns

**Profiles Table Updates** (script 015):
- `last_mined_at`: Timestamp of last mine
- `next_mine_at`: Timestamp when next mine is available
- `total_mined`: Cumulative amount mined by user
- `mining_streak`: Number of consecutive mines

**Supply Tracking Table** (script 016):
- `total_supply`: 300,000 GX (constant)
- `mined_supply`: Total amount mined by all users
- `remaining_supply`: Calculated remaining supply
- `last_updated`: Last update timestamp

#### Automatic Supply Updates
- Trigger function `update_supply_on_mine()` automatically updates supply when coins are mined
- Real-time supply tracking across all users

### 5. Timer Persistence
- **Old**: Countdown stored in localStorage, reset on refresh
- **New**: Timer calculated from `next_mine_at` timestamp in database
- **Benefit**: Timer persists across page refreshes and devices

### 6. Mining Flow

1. User clicks "Mine Now" (only enabled when timer reaches 0:00:00)
2. System checks remaining supply
3. If supply available:
   - Insert 2.50 GX into `coins` table
   - Record transaction in `transactions` table
   - Update profile with new timestamps and totals
   - Trigger automatically updates global supply
4. Timer resets to 2.5 hours
5. Balance updates immediately

### 7. Real-time Supply Display
- Dashboard shows remaining supply with live updates every 5 seconds
- Percentage indicator shows how much supply remains
- Visual feedback with color-coded stats card

## SQL Scripts to Run

Execute these scripts in order in your Supabase SQL Editor:

1. **015_add_mining_fields_to_profiles.sql** - Adds mining tracking fields
2. **016_create_supply_tracking.sql** - Creates supply tracking table and trigger

## Testing Checklist

- [ ] New users can mine immediately (first mine)
- [ ] Timer counts down from 2.5 hours after mining
- [ ] Timer persists across page refreshes
- [ ] Balance increases by exactly 2.50 GX per mine
- [ ] Remaining supply decreases by 2.50 GX per mine
- [ ] Mining halts when supply reaches 0
- [ ] Dashboard displays remaining supply correctly
- [ ] Multiple users mining updates supply correctly

## Migration Notes

For existing users:
- `next_mine_at` is set to current time (allows immediate mine)
- All new fields default to 0
- Existing balances are preserved

## Technical Details

### Timer Calculation
\`\`\`typescript
const nextMineDate = new Date(profile.next_mine_at)
const now = new Date()
const diffInSeconds = Math.max(0, Math.floor((nextMineDate.getTime() - now.getTime()) / 1000))
\`\`\`

### Supply Update Trigger
\`\`\`sql
create trigger on_mine_update_supply
  after insert on public.coins
  for each row
  execute function update_supply_on_mine();
\`\`\`

This ensures supply is automatically updated whenever a coin is mined, maintaining data consistency.

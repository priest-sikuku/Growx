# SQL Script Cleanup

## Removed Scripts

### scripts/018_update_listings_add_fields.sql
**Reason**: This script was obsolete and conflicting with script 020.

Script 018 tried to:
- Add `listing_type`, `terms`, and `payment_account` columns
- Rename `seller_id` to `user_id`

However, script 020 (`020_fix_listings_table.sql`) already:
- Drops and recreates the entire listings table
- Includes all the columns from script 018
- Uses `user_id` from the start

## Current Database Setup Order

Run these scripts in order:

1. `001_create_profiles.sql` - Create profiles table
2. `002_create_coins.sql` - Create coins table
3. `003_create_listings.sql` - Create initial listings table
4. `020_fix_listings_table.sql` - Recreate listings with correct structure
5. `004_create_trades.sql` - Create trades table
6. `021_add_escrow_to_trades.sql` - Add escrow fields to trades
7. `022_add_seller_buyer_ids_to_profiles.sql` - Add seller/buyer IDs to profiles
8. `023_create_gx_price_system.sql` - Create price tracking system
9. `025_create_user_stats_views.sql` - Create user stats views
10. `026_fix_trades_schema.sql` - Fix trades schema with missing columns

## Note
If you've already run script 018 and got an error, you can safely ignore it and proceed with script 020, which will fix the table structure.

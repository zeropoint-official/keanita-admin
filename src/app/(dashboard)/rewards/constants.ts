export const POINTS_REASONS = ['daily_login', 'streak_bonus', 'game', 'event_rsvp', 'profile_complete', 'qr_scan', 'gift_redeem', 'refund', 'manual', 'birthday', 'expiry'] as const;
export type PointsReason = (typeof POINTS_REASONS)[number];

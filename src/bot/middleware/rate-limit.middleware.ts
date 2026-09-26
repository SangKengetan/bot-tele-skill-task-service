import { Context } from 'telegraf';

const userTimeouts = new Map<number, number>();

/**
 * Simple in-memory rate limiter middleware for Telegram bot.
 * Prevents users from spamming commands/messages.
 */
export const rateLimitMiddleware = (limitMs = 1000) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const userId = ctx.from?.id;

    if (userId) {
      const now = Date.now();
      const lastAction = userTimeouts.get(userId);

      if (lastAction && (now - lastAction) < limitMs) {
        // User is spamming
        return; // Ignore the message quietly
      }

      userTimeouts.set(userId, now);
      
      // Clean up old entries periodically to prevent memory leaks in production (simple approach)
      if (userTimeouts.size > 10000) {
        userTimeouts.clear();
      }
    }

    return next();
  };
};

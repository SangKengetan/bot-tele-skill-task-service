import { describe, it, expect } from 'vitest';
import { createTaskSchema } from '../../src/schemas/task.schema';

describe('Task Validation Schemas', () => {
  it('should validate a valid task', () => {
    const validData = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Valid Task',
      priority: 'high',
    };

    const result = createTaskSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid user_id', () => {
    const invalidData = {
      user_id: 'not-a-uuid',
      title: 'Invalid UUID Task',
    };

    const result = createTaskSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('UUID');
    }
  });

  it('should reject deadline_at before scheduled_at', () => {
    const invalidDatesData = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Time Travel Task',
      scheduled_at: '2026-09-08T20:00:00+08:00',
      deadline_at: '2026-09-08T19:00:00+08:00', // deadline before scheduled
    };

    const result = createTaskSchema.safeParse(invalidDatesData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('greater than or equal to scheduled_at');
    }
  });
});

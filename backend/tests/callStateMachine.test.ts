import { describe, it, expect } from 'vitest';
import { CallStateMachine } from '../src/workers/callStateMachine.js';

describe('Call State Machine Transitions', () => {
  it('should allow valid transitions', () => {
    expect(CallStateMachine.isValidTransition('QUEUED', 'DIALING')).toBe(true);
    expect(CallStateMachine.isValidTransition('DIALING', 'RINGING')).toBe(true);
    expect(CallStateMachine.isValidTransition('RINGING', 'ANSWERED')).toBe(true);
    expect(CallStateMachine.isValidTransition('ANSWERED', 'ENDED')).toBe(true);
    expect(CallStateMachine.isValidTransition('RINGING', 'NO_ANSWER')).toBe(true);
    expect(CallStateMachine.isValidTransition('RINGING', 'BUSY')).toBe(true);
    expect(CallStateMachine.isValidTransition('DIALING', 'FAILED')).toBe(true);
  });

  it('should block invalid transitions', () => {
    expect(CallStateMachine.isValidTransition('ENDED', 'RINGING')).toBe(false);
    expect(CallStateMachine.isValidTransition('ENDED', 'ANSWERED')).toBe(false);
    expect(CallStateMachine.isValidTransition('FAILED', 'DIALING')).toBe(false);
    expect(CallStateMachine.isValidTransition('NO_ANSWER', 'ANSWERED')).toBe(false);
  });
});

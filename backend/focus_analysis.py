"""Focus-loss rules shared by the lesson focus tracking API."""

FOCUS_LOSS_SECONDS = 2.0
FOCUS_REMINDER_DELAY_SECONDS = 3.0


def is_focus_lost(last_detected_at: float | None, now: float) -> bool:
    """Return True after the configured period without a body detection."""
    return last_detected_at is None or now - last_detected_at > FOCUS_LOSS_SECONDS

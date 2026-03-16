// wait-for-idle: blocks until keyboard AND mouse have been idle for N seconds.
// Usage: wait-for-idle <threshold_seconds> <timeout_seconds>
// macOS only — uses CGEventSource API.

#include <CoreGraphics/CoreGraphics.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: wait-for-idle <threshold_secs> <timeout_secs>\n");
        return 1;
    }

    double threshold = atof(argv[1]);
    double timeout = atof(argv[2]);
    double elapsed = 0;
    double interval = 0.25;

    while (elapsed < timeout) {
        double kb_idle = CGEventSourceSecondsSinceLastEventType(
            kCGEventSourceStateCombinedSessionState,
            kCGEventKeyDown
        );
        double mouse_idle = CGEventSourceSecondsSinceLastEventType(
            kCGEventSourceStateCombinedSessionState,
            kCGEventMouseMoved
        );
        double click_idle = CGEventSourceSecondsSinceLastEventType(
            kCGEventSourceStateCombinedSessionState,
            kCGEventLeftMouseDown
        );

        if (kb_idle >= threshold && mouse_idle >= threshold && click_idle >= threshold) {
            return 0;
        }

        usleep((useconds_t)(interval * 1000000));
        elapsed += interval;
    }

    // Timeout — proceed anyway
    return 0;
}

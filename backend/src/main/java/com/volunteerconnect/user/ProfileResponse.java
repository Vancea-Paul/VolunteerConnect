package com.volunteerconnect.user;

import java.time.Instant;
import java.util.List;

public record ProfileResponse(
        String username,
        String email,
        List<String> roles,
        Instant createdAt,
        Instant updatedAt
) {
}

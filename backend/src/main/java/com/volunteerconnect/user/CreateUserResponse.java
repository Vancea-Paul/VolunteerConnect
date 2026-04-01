package com.volunteerconnect.user;

import java.util.List;

public record CreateUserResponse(
        Long id,
        String username,
        String email,
        List<String> roles,
        String generatedPassword
) {
}

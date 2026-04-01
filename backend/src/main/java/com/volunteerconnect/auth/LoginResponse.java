package com.volunteerconnect.auth;

public record LoginResponse(String token, String username, String role) {
}

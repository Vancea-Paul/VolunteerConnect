package com.volunteerconnect.auth;

import com.volunteerconnect.user.User;
import com.volunteerconnect.user.UserRepository;
import com.volunteerconnect.user.RoleName;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository
                .findByUsername(request.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String primaryRole = resolvePrimaryRole(user);
        return new LoginResponse("dummy-token", user.getUsername(), primaryRole);
    }

    private String resolvePrimaryRole(User user) {
        if (user.getRoles().stream().anyMatch(role -> RoleName.ADMIN.equals(role.getName()))) {
            return RoleName.ADMIN;
        }
        if (user.getRoles().stream().anyMatch(role -> RoleName.MENTOR.equals(role.getName()))) {
            return RoleName.MENTOR;
        }
        return RoleName.VOLUNTEER;
    }
}

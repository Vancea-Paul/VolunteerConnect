package com.volunteerconnect.user;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int PASSWORD_LENGTH = 12;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public CreateUserResponse createUser(CreateUserRequest request) {
        User requester = requireRequester(request.requesterUsername());
        if (!hasRole(requester, RoleName.ADMIN) && !hasRole(requester, RoleName.MENTOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
        }

        String roleName = normalizeRole(request.role());
        if (RoleName.ADMIN.equals(roleName)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can create admins");
        }
        if (RoleName.MENTOR.equals(roleName) && !hasRole(requester, RoleName.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can create mentors");
        }

        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        Role role = roleRepository
                .findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        String generatedPassword = generatePassword();
        user.setPasswordHash(passwordEncoder.encode(generatedPassword));
        user.setActive(true);
        user.getRoles().add(role);
        return toCreateResponse(userRepository.save(user), generatedPassword);
    }

    public CreateUserResponse createAdmin(CreateUserRequest request) {
        User requester = requireRequester(request.requesterUsername());
        if (!hasRole(requester, RoleName.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can create admins");
        }

        String roleName = normalizeRole(request.role());
        if (!RoleName.ADMIN.equals(roleName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be ADMIN");
        }

        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        Role role = roleRepository
                .findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        String generatedPassword = generatePassword();
        user.setPasswordHash(passwordEncoder.encode(generatedPassword));
        user.setActive(true);
        user.getRoles().add(role);
        return toCreateResponse(userRepository.save(user), generatedPassword);
    }

    public void deleteUser(String targetUsername, String requesterUsername) {
        User requester = requireRequester(requesterUsername);
        boolean requesterAdmin = hasRole(requester, RoleName.ADMIN);
        if (!requesterAdmin && !hasRole(requester, RoleName.MENTOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
        }

        User target = userRepository
                .findByUsername(targetUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (hasRole(target, RoleName.ADMIN) && !requesterAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Mentors cannot delete admins");
        }
        if (hasRole(target, RoleName.MENTOR) && !requesterAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Mentors cannot delete mentors");
        }

        userRepository.delete(target);
    }

    public List<UserResponse> listVolunteers(String requesterUsername) {
        User requester = requireRequester(requesterUsername);
        if (!hasRole(requester, RoleName.ADMIN) && !hasRole(requester, RoleName.MENTOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
        }

        return userRepository.findDistinctByRoles_Name(RoleName.VOLUNTEER)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<UserResponse> listMentors(String requesterUsername) {
        User requester = requireRequester(requesterUsername);
        if (!hasRole(requester, RoleName.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can list mentors");
        }

        return userRepository.findDistinctByRoles_Name(RoleName.MENTOR)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ProfileResponse profile(String username) {
        User user = requireRequester(username);
        return toProfileResponse(user);
    }

    public void changePassword(ChangePasswordRequest request) {
        User user = requireRequester(request.username());

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private User requireRequester(String username) {
        return userRepository
                .findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Requester not found"));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private String normalizeRole(String role) {
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        Set<String> allowed = Set.of(RoleName.ADMIN, RoleName.MENTOR, RoleName.VOLUNTEER);
        if (!allowed.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
        }
        return normalized;
    }

    private String generatePassword() {
        StringBuilder builder = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i += 1) {
            int index = secureRandom.nextInt(PASSWORD_CHARS.length());
            builder.append(PASSWORD_CHARS.charAt(index));
        }
        return builder.toString();
    }

    private UserResponse toResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .collect(Collectors.toList());
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), roles);
    }

    private CreateUserResponse toCreateResponse(User user, String generatedPassword) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .collect(Collectors.toList());
        return new CreateUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roles,
                generatedPassword
        );
    }

    private ProfileResponse toProfileResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .collect(Collectors.toList());
        return new ProfileResponse(
                user.getUsername(),
                user.getEmail(),
                roles,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}

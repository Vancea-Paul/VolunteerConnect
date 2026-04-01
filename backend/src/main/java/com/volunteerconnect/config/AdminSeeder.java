package com.volunteerconnect.config;

import com.volunteerconnect.user.Role;
import com.volunteerconnect.user.RoleName;
import com.volunteerconnect.user.RoleRepository;
import com.volunteerconnect.user.User;
import com.volunteerconnect.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String username;

    @Value("${app.admin.email:admin@volunteerconnect.local}")
    private String email;

    @Value("${app.admin.password:}")
    private String password;

    public AdminSeeder(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (password == null || password.isBlank()) {
            return;
        }

        Role adminRole = ensureRole(RoleName.ADMIN);
        ensureRole(RoleName.MENTOR);
        ensureRole(RoleName.VOLUNTEER);

        User admin = userRepository.findByUsername(username).orElseGet(User::new);
        admin.setUsername(username);
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setActive(true);
        admin.getRoles().add(adminRole);
        userRepository.save(admin);
    }

    private Role ensureRole(String roleName) {
        return roleRepository
                .findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));
    }
}

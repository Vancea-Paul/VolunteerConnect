package com.volunteerconnect.user;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<CreateUserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.createUser(request));
    }

    @PostMapping("/admin")
    public ResponseEntity<CreateUserResponse> createAdmin(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.createAdmin(request));
    }

    @GetMapping("/volunteers")
    public ResponseEntity<List<UserResponse>> listVolunteers(@RequestParam String requesterUsername) {
        return ResponseEntity.ok(userService.listVolunteers(requesterUsername));
    }

    @GetMapping("/mentors")
    public ResponseEntity<List<UserResponse>> listMentors(@RequestParam String requesterUsername) {
        return ResponseEntity.ok(userService.listMentors(requesterUsername));
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> profile(@RequestParam String username) {
        return ResponseEntity.ok(userService.profile(username));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String username,
            @RequestParam String requesterUsername
    ) {
        userService.deleteUser(username, requesterUsername);
        return ResponseEntity.noContent().build();
    }
}

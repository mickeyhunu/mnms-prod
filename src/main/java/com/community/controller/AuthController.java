package com.community.controller;

import com.community.dto.request.LoginRequest;
import com.community.dto.request.RegisterRequest;
import com.community.dto.response.LoginResponse;
import com.community.dto.response.UserResponse;
import com.community.mapper.CommunityMapper;
import com.community.util.JwtUtil;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final CommunityMapper userMapper;
    private final JwtUtil jwtUtil;

    public AuthController(CommunityMapper userMapper, JwtUtil jwtUtil) {
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
    }

    private Long getUserIdFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                return jwtUtil.getUserIdFromToken(token);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            System.out.println("이메일: " + request.getEmail());

            if (userMapper.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "이미 존재하는 이메일입니다"));
            }

            String nickname = generateNickname(request.getCompany());
            
            boolean success = userMapper.insertUser(
                request.getEmail(),
                request.getPassword(),
                request.getDepartment(),
                request.getJobPosition(),
                nickname,
                request.getCompany()
            );

            if (success) {
                System.out.println("회원가입 성공!");
                return ResponseEntity.ok(Map.of(
                    "message", "회원가입이 완료되었습니다",
                    "nickname", nickname
                ));
            } else {
                return ResponseEntity.status(500)
                    .body(Map.of("message", "회원가입에 실패했습니다"));
            }

        } catch (Exception e) {
            System.out.println("회원가입 에러: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("message", "서버 오류가 발생했습니다"));
        }
    }

    private String generateNickname(String company) {
        String baseNickname = (company != null && !company.trim().isEmpty()) 
            ? company.trim() : "사용자";
        
        String nickname;
        int attempt = 0;
        
        do {
            int randomNum = (int) (Math.random() * 999) + 1;
            nickname = baseNickname + "-" + String.format("%03d", randomNum);
            attempt++;
        } while (userMapper.existsByNickname(nickname) && attempt < 10);
        
        if (attempt >= 10) {
            long timestamp = System.currentTimeMillis() % 10000;
            nickname = baseNickname + "-" + timestamp;
        }
        
        return nickname;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            System.out.println("=== JWT 로그인 시도 ===");
            System.out.println("이메일: " + request.getEmail());

            UserResponse user = userMapper.findUserByEmail(request.getEmail());
            if (user == null) {
                System.out.println("사용자를 찾을 수 없음");
                return ResponseEntity.status(401)
                    .body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다"));
            }

            String storedPassword = userMapper.findPasswordByEmail(request.getEmail());
            System.out.println("DB 저장된 비밀번호: " + storedPassword);
            System.out.println("입력된 비밀번호: " + request.getPassword());

            if (storedPassword == null || !request.getPassword().equals(storedPassword)) {
                System.out.println("비밀번호 불일치");
                return ResponseEntity.status(401)
                    .body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다"));
            }

            System.out.println("로그인 성공!");

            boolean isAdmin = "ADMIN".equals(user.getRole());

            // JWT 토큰 생성
            String jwtToken = jwtUtil.generateToken(user.getEmail(), user.getId(), isAdmin);
            System.out.println("JWT 토큰 생성 완료: " + jwtToken.substring(0, 20) + "...");

            LoginResponse response = new LoginResponse();
            response.setToken(jwtToken);  // 실제 JWT 토큰 설정
            response.setId(user.getId());
            response.setEmail(user.getEmail());
            response.setNickname(user.getNickname());
            response.setIsAdmin(isAdmin);

            System.out.println("=== JWT 로그인 응답 완료 ===");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.out.println("로그인 에러: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("message", "서버 오류가 발생했습니다"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        try {
            System.out.println("=== JWT 로그아웃 처리 ===");
            // JWT는 클라이언트에서 토큰을 삭제하면 되므로 서버에서 할 일이 없음
            System.out.println("JWT 로그아웃 완료 (클라이언트에서 토큰 삭제 필요)");
            return ResponseEntity.ok(Map.of("message", "로그아웃되었습니다"));
        } catch (Exception e) {
            System.out.println("로그아웃 에러: " + e.getMessage());
            return ResponseEntity.ok(Map.of("message", "로그아웃되었습니다"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        try {
            System.out.println("=== JWT 현재 사용자 정보 조회 ===");
            
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                System.out.println("JWT 토큰이 없거나 유효하지 않음");
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }

            System.out.println("JWT에서 추출한 userId: " + userId);

            // 사용자 정보 조회
            UserResponse user = userMapper.findUserById(userId);
            if (user == null) {
                System.out.println("사용자를 찾을 수 없음: " + userId);
                return ResponseEntity.status(401).body(Map.of("error", "사용자를 찾을 수 없습니다"));
            }

            boolean isAdmin = "ADMIN".equals(user.getRole());

            Map<String, Object> userInfo = Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "nickname", user.getNickname(),
                "role", user.getRole(),
                "isAdmin", isAdmin
            );

            System.out.println("반환할 사용자 정보: " + userInfo);
            return ResponseEntity.ok(userInfo);
            
        } catch (Exception e) {
            System.out.println("사용자 정보 조회 에러: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("error", "토큰 오류가 발생했습니다"));
        }
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> test() {
        return ResponseEntity.ok(Map.of(
            "message", "JWT Auth controller is working!",
            "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}
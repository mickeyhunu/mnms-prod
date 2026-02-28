package com.community.dto.response;

public class AuthResponse {
    
    private String message;
    private String token;
    private String email;
    private String username;
    private String nickname;
    private String role;
    
    public AuthResponse() {}
    
    public AuthResponse(String message, String token, Object user) {
        this.message = message;
        this.token = token;
        if (user instanceof UserResponse) {
            UserResponse userResp = (UserResponse) user;
            this.email = userResp.getEmail();
            this.username = userResp.getUsername();
            this.nickname = userResp.getNickname();
            this.role = userResp.getRole();
        }
    }
    
    public AuthResponse(String token, String email, String username, String nickname, String role) {
        this.token = token;
        this.email = email;
        this.username = username;
        this.nickname = nickname;
        this.role = role;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getToken() {
        return token;
    }
    
    public void setToken(String token) {
        this.token = token;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getNickname() {
        return nickname;
    }
    
    public void setNickname(String nickname) {
        this.nickname = nickname;
    }
    
    public String getRole() {
        return role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }
}
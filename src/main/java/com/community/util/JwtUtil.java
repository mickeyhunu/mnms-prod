package com.community.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    private final String secretKey = "mySecretKey123456789012345678901234567890";
    private final long expiration = 24 * 60 * 60 * 1000;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public String generateToken(String email, Long userId, boolean isAdmin) {
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("isAdmin", isAdmin)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public String getEmailFromToken(String token) {
        return extractEmail(token);
    }

    public Long extractUserId(String token) {
        return extractClaims(token).get("userId", Long.class);
    }

    public Long getUserIdFromToken(String token) {
        return extractUserId(token);
    }

    public boolean extractIsAdmin(String token) {
        Boolean isAdmin = extractClaims(token).get("isAdmin", Boolean.class);
        return isAdmin != null ? isAdmin : false;
    }

    public Boolean getIsAdminFromToken(String token) {
        return extractIsAdmin(token);
    }

    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean validateToken(String token) {
        return isTokenValid(token);
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
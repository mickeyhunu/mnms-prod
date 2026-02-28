package com.community.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.ui.Model;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        System.out.println("=== HomeController: / 요청 받음 ===");
        return "index";
    }

    @GetMapping("/index")
    public String index() {
        System.out.println("=== HomeController: /index 요청 받음 ===");
        return "index";
    }

    @GetMapping("/login")
    public String login() {
        System.out.println("=== HomeController: /login 요청 받음 ===");
        return "login";
    }

    @GetMapping("/register")
    public String register() {
        System.out.println("=== HomeController: /register 요청 받음 ===");
        return "register";
    }

    @GetMapping("/post/{id}")
    public String postDetail(@PathVariable Long id, Model model) {
        System.out.println("=== HomeController: /post/" + id + " 요청 받음 ===");
        return "post-detail";
    }

    @GetMapping("/post-detail")
    public String postDetailWithParam() {
        System.out.println("=== HomeController: /post-detail 요청 받음 ===");
        return "post-detail";
    }

    @GetMapping("/create-post")
    public String createPost() {
        System.out.println("=== HomeController: /create-post 요청 받음 ===");
        return "create-post";
    }

    @GetMapping("/my-page")
    public String myPageAlias() {
        return "my-page";
    }

    @GetMapping("/mypage") 
    public String mypage() {
        return "my-page";
    }

    @GetMapping("/admin")
    public String admin() {
        System.out.println("=== HomeController: /admin 요청 받음 ===");
        return "admin";
    }

    @GetMapping("/bookmarks")
    public String bookmarks() {
        System.out.println("=== HomeController: /bookmarks 요청 받음 ===");
        return "bookmarks";
    }
}
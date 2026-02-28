package com.community.controller;

import com.community.dto.response.PostResponse;
import com.community.mapper.CommunityMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class PostViewController {
    
    @Autowired
    private CommunityMapper mapper;
    
    @GetMapping("/posts/detail")
    public ModelAndView postDetail(@RequestParam Long id) {
        try {
            PostResponse post = mapper.findPostById(id);
            if (post == null) {
                ModelAndView mv = new ModelAndView();
                mv.setViewName("error");
                mv.addObject("errorMessage", "게시글을 찾을 수 없습니다.");
                return mv;
            }
            
            ModelAndView mv = new ModelAndView();
            mv.addObject("post", post);
            mv.setViewName("post-detail");
            return mv;
            
        } catch (Exception e) {
            ModelAndView mv = new ModelAndView();
            mv.setViewName("error");
            mv.addObject("errorMessage", "게시글을 불러오는 중 오류가 발생했습니다.");
            return mv;
        }
    }
}
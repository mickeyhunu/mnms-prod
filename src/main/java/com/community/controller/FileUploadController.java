package com.community.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.community.mapper.CommunityMapper;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/file-upload")
public class FileUploadController {

    private final CommunityMapper postMapper;
    private final Set<String> allowedExtensions = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private final long maxFileSize = 5 * 1024 * 1024;
    private final int maxFileCount = 10;

    public FileUploadController(CommunityMapper postMapper) {
        this.postMapper = postMapper;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadImages(@RequestParam("files") MultipartFile[] files,
                                                           @RequestParam(required = false) Long postId) {
        Map<String, Object> response = new HashMap<>();
        List<Map<String, Object>> uploadedFiles = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        if (files.length > maxFileCount) {
            errors.add("최대 " + maxFileCount + "장까지만 업로드 가능합니다.");
            response.put("success", false);
            response.put("errors", errors);
            return ResponseEntity.badRequest().body(response);
        }

        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                errors.add("빈 파일이 있습니다.");
                continue;
            }

            if (file.getSize() > maxFileSize) {
                errors.add(file.getOriginalFilename() + ": 파일 크기가 5MB를 초과합니다.");
                continue;
            }

            String originalFileName = file.getOriginalFilename();
            String extension = getFileExtension(originalFileName);
            
            if (!allowedExtensions.contains(extension.toLowerCase())) {
                errors.add(originalFileName + ": 지원하지 않는 파일 형식입니다.");
                continue;
            }

            try {
                String storedFileName = UUID.randomUUID().toString() + "." + extension;
                byte[] fileData = file.getBytes();
                
                Long fileId = null;
                if (postId != null) {
                    Map<String, Object> fileParams = new HashMap<>();
                    fileParams.put("postId", postId);
                    fileParams.put("originalFileName", originalFileName);
                    fileParams.put("storedFileName", storedFileName);
                    fileParams.put("fileData", fileData);
                    fileParams.put("size", file.getSize());
                    fileParams.put("contentType", file.getContentType());

                    postMapper.insertPostFile(fileParams);
                    fileId = (Long) fileParams.get("id");
                }
                
                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("fileId", fileId);
                fileInfo.put("originalName", originalFileName);
                fileInfo.put("storedName", storedFileName);
                fileInfo.put("fileSize", file.getSize());
                fileInfo.put("contentType", file.getContentType());
                
                uploadedFiles.add(fileInfo);
            } catch (IOException e) {
                errors.add(originalFileName + ": 파일 저장에 실패했습니다.");
            }
        }

        response.put("success", uploadedFiles.size() > 0);
        response.put("files", uploadedFiles);
        response.put("uploadedCount", uploadedFiles.size());
        
        if (!errors.isEmpty()) {
            response.put("errors", errors);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/image/{fileId}")
    public ResponseEntity<byte[]> getImage(@PathVariable Long fileId) {
        try {
            Map<String, Object> fileData = postMapper.getFileData(fileId);
            if (fileData == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] data = (byte[]) fileData.get("fileData");
            String contentType = (String) fileData.get("contentType");

            return ResponseEntity.ok()
                    .header("Content-Type", contentType != null ? contentType : "image/jpeg")
                    .body(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }
}
# 배포 작업 메모 (midnightmens)

## 1) 서버 접속
cd Documents/aws
ssh -i .\mmnsKey.pem ubuntu@43.202.61.53

## 2) 앱 실행/자동 실행 등록 (PM2)
pm2 start server.js --name midnightmens
pm2 startup
pm2 save

## 3) Nginx 설치/활성화
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

## 4) Nginx 사이트 설정 (이 프로젝트용)
# server.js 는 PORT 기본값이 8080이고, 프론트+API를 모두 같은 Express 앱에서 처리함.
sudo nano /etc/nginx/sites-available/midnightmens

# 아래 내용을 붙여넣기
server {
    listen 80;
    listen [::]:80;
    server_name nightmens.com www.nightmens.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

sudo ln -s /etc/nginx/sites-available/midnightmens /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
pm2 restart midnightmens

## 5) 코드 업데이트 배포 루틴
git fetch --all --prune
git pull --ff-only origin main
sudo nginx -t && sudo systemctl reload nginx
pm2 restart midnightmens

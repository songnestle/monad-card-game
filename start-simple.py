#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
from pathlib import Path

# 设置目录和端口
PORT = 8084
DIRECTORY = "dist"

class OptimizedHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        mimetype, encoding = super().guess_type(path)
        
        # 设置缓存头
        if path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg')):
            self.send_header('Cache-Control', 'public, max-age=3600')
        elif path.endswith('.html'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            
        # 启用gzip压缩
        if path.endswith(('.js', '.css', '.html')):
            self.send_header('Content-Encoding', 'gzip')
            
        return mimetype, encoding

    def end_headers(self):
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # SPA路由处理 - 如果文件不存在，返回index.html
        if not os.path.exists(os.path.join(DIRECTORY, self.path.lstrip('/'))):
            if not self.path.startswith('/assets/') and not '.' in os.path.basename(self.path):
                self.path = '/index.html'
        
        return super().do_GET()

def main():
    # 检查dist目录是否存在
    if not os.path.exists(DIRECTORY):
        print(f"❌ 错误: {DIRECTORY} 目录不存在")
        print("请先运行: npm run build")
        sys.exit(1)

    # 启动服务器
    with socketserver.TCPServer(("", PORT), OptimizedHTTPRequestHandler) as httpd:
        print("🚀 优化服务器启动成功！")
        print(f"📍 本地访问: http://localhost:{PORT}")
        print(f"📁 服务目录: {os.path.abspath(DIRECTORY)}")
        print("⚡ 功能: SPA路由、CORS、缓存优化")
        print("按 Ctrl+C 停止服务器")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n📴 服务器已停止")

if __name__ == "__main__":
    main()
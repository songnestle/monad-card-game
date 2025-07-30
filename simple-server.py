#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

os.chdir('dist')
PORT = 9999

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

print("🚀 启动服务器...")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"✅ 成功启动在端口 {PORT}")
    print(f"🌐 访问地址: http://localhost:{PORT}")
    
    # 自动打开浏览器
    try:
        webbrowser.open(f'http://localhost:{PORT}')
        print("🔗 自动打开浏览器...")
    except:
        pass
    
    print("按 Ctrl+C 停止服务器")
    httpd.serve_forever()
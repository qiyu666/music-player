// sw.js
const CACHE_NAME = 'music-player-v1';
// 需要缓存的静态资源列表
const urlsToCache = [
  './',
  './index.html',
  './css/audio.css',
  './js/audio.js',
  './img/icon-192x192.png', // 确保路径正确
  // 添加其他必要的图片或库
];

// 安装阶段：缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // 强制激活新 Service Worker
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 1. 对于 HTML/CSS/JS/图片 等静态资源，优先使用缓存
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );
  }

  // 2. 对于音乐文件 (.mp3)，尝试网络优先，但失败时如果有缓存则使用缓存
  // 注意：这需要用户先在线播放过这首歌，它才会被缓存
  if (request.url.endsWith('.mp3')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );

    // 同时在后台将音乐缓存下来，以便下次离线使用
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request.url).then((response) => {
          // 克隆响应以避免被消费
          return cache.put(request, response.clone());
        }).catch(() => {/* 忽略网络错误 */});
      })
    );
  }
});

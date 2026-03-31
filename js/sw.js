// Service Worker for Music Player - 离线访问功能
const CACHE_NAME = 'music-player-v2';

// 需要缓存的静态资源列表 - 核心文件
const CORE_FILES = [
  './',
  './index.html',
  './css/audio.css',
  './js/audio.js',
  './js/sw-register.js',
  './img/tb.png'
];

// 音乐文件列表
const MUSIC_FILES = [];
for (let i = 0; i <= 12; i++) {
  MUSIC_FILES.push(`./mp3/music${i}.mp3`);
}

// 歌词文件列表
const LYRICS_FILES = [];
for (let i = 0; i <= 12; i++) {
  LYRICS_FILES.push(`./gc/music${i}.lrc`);
}

// 背景图片列表
const BG_IMAGES = [];
for (let i = 0; i <= 12; i++) {
  BG_IMAGES.push(`./img/bg${i}.png`);
}

// 唱片图片列表
const RECORD_IMAGES = [];
for (let i = 0; i <= 12; i++) {
  RECORD_IMAGES.push(`./img/record${i}.jpg`);
}

// 控制按钮图片列表
const CONTROL_IMAGES = [
  './img/mode1.png',
  './img/mode2.png',
  './img/mode3.png',
  './img/上一首.png',
  './img/下一首.png',
  './img/列表.png',
  './img/播放记录.png',
  './img/暂停.png',
  './img/继续播放.png',
  './img/静音.png',
  './img/音量.png'
];

// 所有需要预缓存的文件
const ALL_CACHABLE_FILES = [
  ...CORE_FILES,
  ...MUSIC_FILES,
  ...LYRICS_FILES,
  ...BG_IMAGES,
  ...RECORD_IMAGES,
  ...CONTROL_IMAGES
];
// 安装阶段：缓存所有文件 - 实现整站离线
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker - Caching entire site...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching ALL files for full offline support');
        // 缓存所有文件，包括核心文件、音乐、歌词、图片
        return cache.addAll(ALL_CACHABLE_FILES);
      })
      .then(() => {
        console.log('[SW] All files cached successfully!');
        console.log('[SW] Total files cached:', ALL_CACHABLE_FILES.length);
        // 跳过等待，直接激活
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        // 立即获取所有客户端控制权
        return self.clients.claim();
      })
  );
});

// 预缓存音乐文件（后台下载）
function precacheMusicFiles() {
  caches.open(CACHE_NAME).then((cache) => {
    console.log('[SW] Pre-caching music files...');
    Promise.all(
      MUSIC_FILES.map((url) => {
        return fetch(url, { mode: 'cors' })
          .then((response) => {
            if (response.ok) {
              return cache.put(url, response.clone());
            }
          })
          .catch(() => {
            console.log('[SW] Failed to pre-cache:', url);
          });
      })
    ).then(() => {
      console.log('[SW] Music pre-caching complete');
    });
  });
}

// 预缓存歌词文件
function precacheLyricsFiles() {
  caches.open(CACHE_NAME).then((cache) => {
    console.log('[SW] Pre-caching lyrics files...');
    Promise.all(
      LYRICS_FILES.map((url) => {
        return fetch(url, { mode: 'cors' })
          .then((response) => {
            if (response.ok) {
              return cache.put(url, response.clone());
            }
          })
          .catch(() => {
            console.log('[SW] Failed to pre-cache lyrics:', url);
          });
      })
    ).then(() => {
      console.log('[SW] Lyrics pre-caching complete');
    });
  });
}

// 预缓存图片文件
function precacheImageFiles() {
  const imageFiles = [...BG_IMAGES, ...RECORD_IMAGES];
  caches.open(CACHE_NAME).then((cache) => {
    console.log('[SW] Pre-caching image files...');
    Promise.all(
      imageFiles.map((url) => {
        return fetch(url, { mode: 'cors' })
          .then((response) => {
            if (response.ok) {
              return cache.put(url, response.clone());
            }
          })
          .catch(() => {
            console.log('[SW] Failed to pre-cache image:', url);
          });
      })
    ).then(() => {
      console.log('[SW] Image pre-caching complete');
    });
  });
}

// 后台同步预缓存
function startBackgroundPrecache() {
  // 使用 setTimeout 确保不在 install 事件中阻塞
  setTimeout(() => {
    precacheMusicFiles();
    precacheLyricsFiles();
    precacheImageFiles();
  }, 2000);
}

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 1. 对于核心静态资源（HTML/CSS/JS/图片），优先使用缓存，失败时回退到网络
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.url.endsWith('.png') ||
    request.url.endsWith('.jpg') ||
    request.url.endsWith('.css') ||
    request.url.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // 返回缓存
            return cachedResponse;
          }
          // 缓存未命中，尝试网络请求
          return fetch(request)
            .then((networkResponse) => {
              // 网络请求成功，缓存并返回
              if (networkResponse.ok) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // 网络也失败，返回离线提示（如果是HTML请求）
              if (request.destination === 'document') {
                return caches.match('./index.html');
              }
            });
        })
    );
    return;
  }

  // 2. 对于音乐文件 (.mp3)，网络优先策略，失败时使用缓存
  if (request.url.endsWith('.mp3')) {
    event.respondWith(
      fetch(request, { mode: 'cors' })
        .then((response) => {
          // 网络请求成功，缓存音频文件
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败，返回缓存的音频
          console.log('[SW] Network failed for music, trying cache:', request.url);
          return caches.match(request);
        })
    );
    return;
  }

  // 3. 对于歌词文件 (.lrc)，缓存优先策略
  if (request.url.endsWith('.lrc')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 缓存未命中，尝试网络请求
          return fetch(request, { mode: 'cors' })
            .then((networkResponse) => {
              if (networkResponse.ok) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // 返回空的歌词文件
              return new Response('', { status: 200 });
            });
        })
    );
    return;
  }
});

// 监听来自主线程的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'PRECACHE_ALL') {
    // 用户触发的全量预缓存
    startBackgroundPrecache();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    // 返回缓存状态
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({
          type: 'CACHE_STATUS',
          cachedFiles: keys.length
        });
      });
    });
  }
});

// 开始后台预缓存
startBackgroundPrecache();

console.log('[SW] Service Worker loaded');

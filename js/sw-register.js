// Service Worker 注册文件
// 用于管理 Service Worker 的注册、更新和离线状态

const SW_PATH = './js/sw.js';

// 检查浏览器是否支持 Service Worker
if ('serviceWorker' in navigator) {
    // 页面加载完成后注册 Service Worker
    window.addEventListener('load', () => {
        registerServiceWorker();
    });
}

// 注册 Service Worker
function registerServiceWorker() {
    navigator.serviceWorker.register(SW_PATH)
        .then((registration) => {
            console.log('[SW Register] Service Worker registered:', registration.scope);
            
            // 检查是否有更新
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[SW Register] New Service Worker found');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 新的 Service Worker 已安装
                        console.log('[SW Register] New version available');
                        showUpdateNotification();
                    }
                });
            });
        })
        .catch((error) => {
            console.error('[SW Register] Registration failed:', error);
        });
}

// 显示更新提示
function showUpdateNotification() {
    // 创建一个简单的更新提示
    const notification = document.createElement('div');
    notification.id = 'sw-update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span>有新版本可用</span>
            <button id="sw-update-btn">刷新</button>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .update-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        #sw-update-btn {
            background: white;
            color: #667eea;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
        }
        #sw-update-btn:hover {
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    document.getElementById('sw-update-btn').addEventListener('click', () => {
        location.reload();
    });
}

// 手动触发预缓存所有文件
function precacheAllFiles() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_ALL' });
        console.log('[SW Register] Triggered full pre-caching');
    }
}

// 获取缓存状态
function getCacheStatus(callback) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
            callback(event.data);
        };
        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_CACHE_STATUS' },
            [channel.port2]
        );
    }
}

// 监听离线/在线状态
window.addEventListener('online', () => {
    console.log('[Network] Online');
    document.body.classList.remove('offline-mode');
});

window.addEventListener('offline', () => {
    console.log('[Network] Offline');
    document.body.classList.add('offline-mode');
    showOfflineNotification();
});

// 显示离线提示
function showOfflineNotification() {
    // 避免重复显示
    if (document.getElementById('offline-notification')) return;
    
    const notification = document.createElement('div');
    notification.id = 'offline-notification';
    notification.innerHTML = `
        <span>📡 您已离线，但可以继续播放已缓存的音乐</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: fadeInDown 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInDown {
            from {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeInDown 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// 导出方法供外部使用
window.ServiceWorkerManager = {
    precacheAllFiles,
    getCacheStatus,
    registerServiceWorker
};

// 如果需要，可以手动触发预缓存
// window.ServiceWorkerManager.precacheAllFiles();

console.log('[SW Register] Service Worker registration script loaded');

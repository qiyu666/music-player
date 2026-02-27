// DOM元素引用
const elements = {
    body: document.getElementById('body'),
    audio: document.getElementById('audioTag'),
    musicTitle: document.getElementById('music-title'),
    recordImg: document.getElementById('record-img'),
    author: document.getElementById('author-name'),
    progress: document.getElementById('progress'),
    progressTotal: document.getElementById('progress-total'),
    playedTime: document.getElementById('playedTime'),
    audioTime: document.getElementById('audioTime'),
    mode: document.getElementById('playMode'),
    skipForward: document.getElementById('skipForward'),
    playPause: document.getElementById('playPause'),
    skipBackward: document.getElementById('skipBackward'),
    volume: document.getElementById('volume'),
    volumeTogger: document.getElementById('volumn-togger'),
    list: document.getElementById('list'),
    history: document.getElementById('history'),
    speed: document.getElementById('speed'),
    closeList: document.getElementById('close-list'),
    closeHistory: document.getElementById('close-history'),
    musicList: document.getElementById('music-list'),
    historyPanel: document.getElementById('history-panel'),
    allList: document.getElementById('all-list'),
    lyricsContent: document.getElementById('lyrics-content'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    favorite: document.getElementById('favorite'),
    shortcuts: document.getElementById('shortcuts'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    closeShortcuts: document.getElementById('close-shortcuts'),
    download: document.getElementById('download'),
    visualization: document.getElementById('visualization')
};

const { audio, recordImg } = elements;

// 音频可视化相关变量
let audioContext;
let analyser;
let dataArray;
let bufferLength;
let canvasContext;
let animationId;

// 音乐数据 - [歌曲名, 歌手]
const musicData = [
    ['LifeLine', 'Zeraphym'],
    ['III(Find Yourself)', 'Athletics'],
    ['안녕goodbye', 'dia'],
    ['Faded Light', 'Pylot'],
    ['Duvet', 'Bôa'],
    ['Towards the Light', 'Jacoo'],
    ['green to blue', 'Aurenth'],
    ['Are You Lost', 'park bird'],
    ['回忆观影券(伴奏)', 'IN-K/王忻辰'],
    ['24/7(氛围)', 'Diary'],
    ['中式梦核MMM', '百万调音师&失眠飞行'],
    ['Dramamine', 'flawed mangoes'],
    ['Estrella', 'm-take']
];

// 状态变量
let musicId = 0;
let modeId = 1;
let lastVolume = 70;
const playbackSpeeds = [1.0, 1.5, 2.0, 0.5];
let currentSpeedIndex = 0;
let currentLyrics = [];
let currentLyricIndex = -1;
let isDragging = false;

// 预加载相关
let preloadAudio = new Audio();
let preloadedMusicId = -1;

// 播放历史
let playHistory = [];
const MAX_HISTORY_ITEMS = 50;

// 本地存储键名
const STORAGE_KEYS = {
    volume: 'musicPlayer_volume',
    mode: 'musicPlayer_mode',
    speed: 'musicPlayer_speed',
    lastMusic: 'musicPlayer_lastMusic',
    favorites: 'musicPlayer_favorites',
    playHistory: 'musicPlayer_playHistory'
};

// 收藏列表
let favorites = [];

// 从本地存储加载设置
function loadSettings() {
    const savedVolume = localStorage.getItem(STORAGE_KEYS.volume);
    if (savedVolume !== null) {
        elements.volumeTogger.value = savedVolume;
        lastVolume = savedVolume;
    }
    
    const savedMode = localStorage.getItem(STORAGE_KEYS.mode);
    if (savedMode !== null) {
        modeId = parseInt(savedMode);
        elements.mode.style.backgroundImage = `url('img/mode${modeId}.png')`;
    }
    
    const savedSpeed = localStorage.getItem(STORAGE_KEYS.speed);
    if (savedSpeed !== null) {
        currentSpeedIndex = playbackSpeeds.indexOf(parseFloat(savedSpeed));
        if (currentSpeedIndex === -1) currentSpeedIndex = 0;
        elements.speed.textContent = `${playbackSpeeds[currentSpeedIndex]}X`;
    }
    
    const savedMusic = localStorage.getItem(STORAGE_KEYS.lastMusic);
    if (savedMusic !== null) {
        musicId = parseInt(savedMusic);
    }
    
    const savedHistory = localStorage.getItem(STORAGE_KEYS.playHistory);
    if (savedHistory !== null) {
        playHistory = JSON.parse(savedHistory);
    }
    
    const savedFavorites = localStorage.getItem(STORAGE_KEYS.favorites);
    if (savedFavorites !== null) {
        favorites = JSON.parse(savedFavorites);
    }
}

// 保存设置到本地存储
function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.volume, elements.volumeTogger.value);
    localStorage.setItem(STORAGE_KEYS.mode, modeId);
    localStorage.setItem(STORAGE_KEYS.speed, playbackSpeeds[currentSpeedIndex]);
    localStorage.setItem(STORAGE_KEYS.lastMusic, musicId);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    localStorage.setItem(STORAGE_KEYS.playHistory, JSON.stringify(playHistory));
}

// 预加载下一首
function preloadNext() {
    const nextMusicId = (musicId + 1) % musicData.length;
    if (nextMusicId !== preloadedMusicId) {
        preloadAudio.src = `mp3/music${nextMusicId}.mp3`;
        preloadAudio.load();
        preloadedMusicId = nextMusicId;
        console.log(`预加载下一首: ${musicData[nextMusicId][0]}`);
    }
}

// 显示加载状态
function showLoading() {
    elements.loading.classList.add('show');
    elements.errorMessage.classList.remove('show');
}

// 添加到播放历史
function addToPlayHistory() {
    // 从历史中移除当前歌曲（如果存在）
    const index = playHistory.indexOf(musicId);
    if (index > -1) {
        playHistory.splice(index, 1);
    }
    
    // 添加到历史开头
    playHistory.unshift(musicId);
    
    // 限制历史记录长度
    if (playHistory.length > MAX_HISTORY_ITEMS) {
        playHistory = playHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // 保存到本地存储
    saveSettings();
    
    // 更新历史显示
    updatePlayHistoryDisplay();
}

// 更新播放历史显示
function updatePlayHistoryDisplay() {
    const historyContainer = document.getElementById('history-list');
    if (!historyContainer) return;
    
    // 清空历史容器
    historyContainer.innerHTML = '';
    
    if (playHistory.length === 0) {
        // 显示无历史提示
        const noHistory = document.createElement('div');
        noHistory.className = 'no-history';
        noHistory.textContent = '暂无播放历史';
        historyContainer.appendChild(noHistory);
    } else {
        // 添加历史记录
        playHistory.forEach((historyMusicId, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.id = `history-${historyMusicId}`;
            historyItem.textContent = `${musicData[historyMusicId][0]} - ${musicData[historyMusicId][1]}`;
            
            // 添加点击事件
            historyItem.addEventListener('click', function() {
                musicId = historyMusicId;
                initAndPlay();
            });
            
            historyContainer.appendChild(historyItem);
        });
    }
}

// 隐藏加载状态
function hideLoading() {
    elements.loading.classList.remove('show');
}

// 显示错误消息
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add('show');
    hideLoading();
    
    setTimeout(() => {
        elements.errorMessage.classList.remove('show');
    }, 3000);
}

// 隐藏错误消息
function hideError() {
    elements.errorMessage.classList.remove('show');
}

// 时间格式化函数
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 解析LRC歌词
function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const lyrics = [];
    
    for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = match[4].trim();
            if (text) {
                lyrics.push({ time, text });
            }
        }
    }
    
    return lyrics;
}

// 加载歌词
async function loadLyrics(musicId) {
    try {
        const response = await fetch(`gc/music${musicId}.lrc`);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lrcText = await response.text();
        currentLyrics = parseLRC(lrcText);
        displayLyrics();
    } catch (error) {
        console.log('无法加载歌词:', error.message);
        currentLyrics = [];
        elements.lyricsContent.innerHTML = '<div class="lyric-line">暂无歌词</div>';
    }
}

// 显示歌词
function displayLyrics() {
    if (currentLyrics.length === 0) {
        elements.lyricsContent.innerHTML = '<div class="lyric-line">暂无歌词</div>';
        return;
    }
    
    elements.lyricsContent.innerHTML = currentLyrics.map((lyric, index) => 
        `<div class="lyric-line" data-index="${index}" data-time="${lyric.time}">${lyric.text}</div>`
    ).join('');
    
    currentLyricIndex = -1;
    
    // 添加歌词点击事件
    const lyricLines = elements.lyricsContent.querySelectorAll('.lyric-line');
    lyricLines.forEach(line => {
        line.addEventListener('click', function() {
            const time = parseFloat(this.dataset.time);
            if (!isNaN(time)) {
                audio.currentTime = time;
                updateProgress();
            }
        });
    });
}

// 更新歌词显示
function updateLyrics(currentTime) {
    if (currentLyrics.length === 0) return;
    
    let newIndex = -1;
    for (let i = currentLyrics.length - 1; i >= 0; i--) {
        if (currentTime >= currentLyrics[i].time) {
            newIndex = i;
            break;
        }
    }
    
    if (newIndex !== currentLyricIndex) {
        currentLyricIndex = newIndex;
        
        const lyricLines = elements.lyricsContent.querySelectorAll('.lyric-line');
        lyricLines.forEach((line, index) => {
            if (index === currentLyricIndex) {
                line.classList.add('active');
            } else {
                line.classList.remove('active');
            }
        });
        
        if (currentLyricIndex >= 0) {
            const activeLine = lyricLines[currentLyricIndex];
            const lineHeight = activeLine.offsetHeight;
            const containerHeight = elements.lyricsContent.parentElement.offsetHeight;
            const offset = containerHeight / 2 - lineHeight / 2;
            const translateY = -(currentLyricIndex * lineHeight - offset);
            elements.lyricsContent.style.transform = `translateY(${translateY}px)`;
        }
    }
}

// 更新进度条
function updateProgress() {
    console.log('更新进度条:', {
        currentTime: audio.currentTime,
        duration: audio.duration,
        isDurationNaN: isNaN(audio.duration)
    });
    
    if (isNaN(audio.duration)) {
        elements.playedTime.textContent = formatTime(audio.currentTime);
        return;
    }
    
    const value = audio.currentTime / audio.duration;
    elements.progress.style.width = `${value * 100}%`;
    elements.playedTime.textContent = formatTime(audio.currentTime);
    updateLyrics(audio.currentTime);
}

// 更新列表中正在播放的歌曲
function updatePlayingIndicator() {
    const allMusicItems = elements.allList.querySelectorAll('.music-section div:not(.section-title)');
    allMusicItems.forEach(item => {
        item.classList.remove('playing');
        if (item.id === `music${musicId}`) {
            item.classList.add('playing');
        }
    });
}

// 更新收藏按钮状态
function updateFavoriteButton() {
    if (favorites.includes(musicId)) {
        elements.favorite.classList.add('active');
    } else {
        elements.favorite.classList.remove('active');
    }
}

// 收藏/取消收藏
elements.favorite.addEventListener('click', function() {
    const index = favorites.indexOf(musicId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(musicId);
    }
    updateFavoriteButton();
    saveSettings();
});

// 打开快捷键提示
elements.shortcuts.addEventListener('click', function() {
    elements.shortcutsModal.classList.add('show');
});

// 关闭快捷键提示
elements.closeShortcuts.addEventListener('click', function() {
    elements.shortcutsModal.classList.remove('show');
});

// 点击弹窗外部关闭
elements.shortcutsModal.addEventListener('click', function(event) {
    if (event.target === elements.shortcutsModal) {
        elements.shortcutsModal.classList.remove('show');
    }
});

// 搜索功能
function searchMusic(keyword) {
    const allMusicItems = elements.allList.querySelectorAll('.music-section div:not(.section-title)');
    const sections = elements.allList.querySelectorAll('.music-section');
    
    if (!keyword.trim()) {
        allMusicItems.forEach(item => item.style.display = '');
        sections.forEach(section => section.style.display = '');
        return;
    }
    
    keyword = keyword.toLowerCase();
    let hasResults = false;
    
    allMusicItems.forEach(item => {
        const musicName = item.textContent.toLowerCase();
        if (musicName.includes(keyword)) {
            item.style.display = '';
            hasResults = true;
        } else {
            item.style.display = 'none';
        }
    });
    
    sections.forEach(section => {
        const visibleItems = section.querySelectorAll('div:not(.section-title):not([style*="display: none"])');
        if (visibleItems.length > 0) {
            section.style.display = '';
        } else {
            section.style.display = 'none';
        }
    });
}

// 搜索输入事件
elements.searchInput.addEventListener('input', function() {
    const keyword = this.value;
    if (keyword) {
        elements.searchClear.classList.add('show');
    } else {
        elements.searchClear.classList.remove('show');
    }
    searchMusic(keyword);
});

// 清除搜索
elements.searchClear.addEventListener('click', function() {
    elements.searchInput.value = '';
    elements.searchClear.classList.remove('show');
    searchMusic('');
});

// 下载功能
elements.download.addEventListener('click', function() {
    downloadMusic();
});

function downloadMusic() {
    const musicName = musicData[musicId][0];
    const authorName = musicData[musicId][1];
    const fileName = `${musicName}-${authorName}.mp3`;
    const audioUrl = `mp3/music${musicId}.mp3`;
    
    // 使用更可靠的下载方法
    fetch(audioUrl)
        .then(response => response.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        })
        .catch(error => {
            console.error('下载失败:', error);
            showError('下载失败，请重试');
        });
}

// 初始化音乐
function initMusic() {
    showLoading();
    audio.src = `mp3/music${musicId}.mp3`;
    audio.load();
    recordImg.classList.remove('rotate-play');
    updatePlayHistoryDisplay();
    
    console.log('初始化音乐:', {
        musicId: musicId,
        src: audio.src,
        currentTime: audio.currentTime
    });
    
    audio.onloadedmetadata = function() {
        hideLoading();
        hideError();
        console.log('音频元数据加载完成:', {
            duration: audio.duration,
            src: audio.src,
            readyState: audio.readyState,
            shouldPlay: window.shouldPlayAudio
        });
        
        elements.musicTitle.textContent = musicData[musicId][0];
        elements.author.textContent = musicData[musicId][1];
        recordImg.style.backgroundImage = `url('img/record${musicId}.jpg?${Date.now()}')`;
        elements.body.style.backgroundImage = `url('img/bg${musicId}.png?${Date.now()}')`;
        
        if (!isNaN(audio.duration)) {
            elements.audioTime.textContent = formatTime(audio.duration);
            loadLyrics(musicId);
            audio.currentTime = 0;
            updateProgress();
            console.log('在loadedmetadata事件中设置总时长:', formatTime(audio.duration));
        } else {
            elements.audioTime.textContent = '00:00';
            elements.playedTime.textContent = '00:00';
            elements.progress.style.width = '0%';
            console.error('音频时长获取失败:', audio);
        }
        
        refreshRotate();
        updatePlayingIndicator();
        updateFavoriteButton();
        preloadNext();
        
        if (window.shouldPlayAudio) {
            // 用户交互触发的播放（点击列表、上一首/下一首）
            audio.play().catch(error => {
                console.error('Play error:', error);
                // 不显示错误提示，因为用户已经主动操作
            });
            elements.playPause.classList.remove('icon-play');
            elements.playPause.classList.add('icon-pause');
            rotateRecord();
            addToPlayHistory();
        } else {
            // 页面初始化时不自动播放，等待用户交互
            elements.playPause.classList.remove('icon-pause');
            elements.playPause.classList.add('icon-play');
        }
        
        // 重置播放标记
        window.shouldPlayAudio = false;
        saveSettings();
    };
    
    audio.onerror = function() {
        hideLoading();
        showError(`无法加载音乐: ${musicData[musicId][0]}`);
        console.error('Audio load error:', audio.error);
        console.error('音频错误详细信息:', {
            src: audio.src,
            networkState: audio.networkState,
            readyState: audio.readyState
        });
    };
}

// 初始化并播放
function initAndPlay(shouldPlay = false) {
    // 标记是否应该播放
    window.shouldPlayAudio = shouldPlay;
    
    initMusic();
    // 初始化音频可视化
    if (!audioContext) {
        initVisualization();
    }
    // 播放逻辑由loadedmetadata事件处理
}

// 播放/暂停切换
elements.playPause.addEventListener('click', function() {
    if (audio.paused) {
        console.log('播放按钮点击，音频状态:', {
            paused: audio.paused,
            readyState: audio.readyState,
            networkState: audio.networkState,
            currentTime: audio.currentTime,
            duration: audio.duration,
            buffered: audio.buffered.length > 0 ? audio.buffered.end(audio.buffered.length - 1) : 0
        });
        
        // 检查音频是否已经加载
        if (audio.readyState === 0) { // HAVE_NOTHING
            console.log('音频尚未加载，需要先初始化');
            initAndPlay(true);
            return;
        }
        
        // 确保音频上下文处于活动状态
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('音频上下文已恢复');
            });
        }
        
        // 直接播放音频，不等待canplay事件
        console.log('开始播放音频');
        
        // 播放音频
        audio.play().then(() => {
            console.log('音频播放成功');
            rotateRecord();
            this.classList.remove('icon-play');
            this.classList.add('icon-pause');
            
            // 初始化音频可视化
            if (!audioContext) {
                initVisualization();
            }
        }).catch(error => {
            console.error('播放失败:', error);
            showError('播放失败，请重试');
        });
    } else {
        console.log('暂停按钮点击');
        audio.pause();
        rotateRecordStop();
        this.classList.remove('icon-pause');
        this.classList.add('icon-play');
    }
});

// 进度条拖动功能
function handleProgressSeek(event) {
    if (isNaN(audio.duration)) return;
    
    const pgsWidth = parseFloat(window.getComputedStyle(elements.progressTotal).width);
    const rect = elements.progressTotal.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const rate = Math.max(0, Math.min(1, offsetX / pgsWidth));
    audio.currentTime = audio.duration * rate;
    updateProgress();
    
    // 确保音频继续播放
    if (!audio.paused) {
        audio.play().catch(error => {
            console.error('播放失败:', error);
        });
    }
}

// 鼠标按下开始拖动
elements.progressTotal.addEventListener('mousedown', function(event) {
    if (isNaN(audio.duration)) return;
    isDragging = true;
    handleProgressSeek(event);
});

// 鼠标移动
document.addEventListener('mousemove', function(event) {
    if (isDragging) {
        handleProgressSeek(event);
    }
});

// 鼠标松开结束拖动
document.addEventListener('mouseup', function() {
    if (isDragging) {
        isDragging = false;
    }
});

// 点击进度条直接跳转
elements.progressTotal.addEventListener('click', function(event) {
    if (isNaN(audio.duration)) return;
    if (isDragging) return; // 避免与拖动事件冲突
    
    handleProgressSeek(event);
    
    // 确保音频继续播放
    if (!audio.paused) {
        audio.play().catch(error => {
            console.error('播放失败:', error);
        });
    }
});

// 触摸事件支持
elements.progressTotal.addEventListener('touchstart', function(event) {
    if (isNaN(audio.duration)) return;
    isDragging = true;
    handleProgressSeek(event.touches[0]);
    event.preventDefault();
});

document.addEventListener('touchmove', function(event) {
    if (isDragging) {
        handleProgressSeek(event.touches[0]);
        event.preventDefault();
    }
});

document.addEventListener('touchend', function() {
    if (isDragging) {
        isDragging = false;
    }
});

// 初始化音频可视化
function initVisualization() {
    try {
        // 确保canvas元素存在
        if (!elements.visualization) {
            console.error('可视化canvas元素不存在');
            return;
        }
        
        // 如果已经初始化过，直接返回
        if (audioContext) {
            console.log('音频可视化已经初始化');
            // 确保音频上下文处于活动状态
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            return;
        }
        
        console.log('初始化音频可视化');
        
        // 创建音频上下文
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建分析器节点
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        // 获取数据数组
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // 获取canvas上下文
        canvasContext = elements.visualization.getContext('2d');
        
        // 连接音频源到分析器
        try {
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) {
            console.error('创建媒体源失败:', e);
            return;
        }
        
        // 开始绘制
        drawVisualization();
        console.log('音频可视化初始化成功');
    } catch (error) {
        console.error('音频可视化初始化失败:', error);
    }
}

// 绘制音频可视化
function drawVisualization() {
    if (!analyser || !canvasContext) return;
    
    // 获取频谱数据
    analyser.getByteFrequencyData(dataArray);
    
    // 清空canvas
    const canvas = elements.visualization;
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置样式
    canvasContext.fillStyle = 'rgba(66, 182, 128, 0.2)';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制频谱柱形图
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // 渐变颜色
        const gradient = canvasContext.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, 'rgba(66, 182, 128, 0.8)');
        gradient.addColorStop(1, 'rgba(66, 182, 128, 0.2)');
        
        canvasContext.fillStyle = gradient;
        canvasContext.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        
        x += barWidth + 1;
    }
    
    // 继续动画
    animationId = requestAnimationFrame(drawVisualization);
}

// 停止音频可视化
function stopVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    if (audioContext) {
        audioContext.close();
    }
}

// 窗口大小改变时重新调整canvas
function resizeCanvas() {
    const canvas = elements.visualization;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// 监听窗口大小变化
window.addEventListener('resize', resizeCanvas);

// 初始化时调整canvas大小
resizeCanvas();

// 点击列表展开音乐列表
elements.list.addEventListener('click', function() {
    elements.musicList.classList.remove('list-card-hide');
    elements.musicList.classList.add('list-card-show');
    elements.musicList.style.display = 'flex';
    elements.closeList.style.display = 'flex';
});

// 点击历史展开播放历史
elements.history.addEventListener('click', function() {
    elements.historyPanel.classList.remove('list-card-hide');
    elements.historyPanel.classList.add('list-card-show');
    elements.closeHistory.style.display = 'flex';
});

// 点击关闭面板关闭音乐列表
elements.closeList.addEventListener('click', function() {
    elements.musicList.classList.remove('list-card-show');
    elements.musicList.classList.add('list-card-hide');
    elements.closeList.style.display = 'none';
});

// 点击关闭面板关闭播放历史
elements.closeHistory.addEventListener('click', function() {
    elements.historyPanel.classList.remove('list-card-show');
    elements.historyPanel.classList.add('list-card-hide');
    elements.closeHistory.style.display = 'none';
});

// 播放模式设置
elements.mode.addEventListener('click', function() {
    modeId = (modeId % 4) + 1;
    this.style.backgroundImage = `url('img/mode${modeId}.png')`;
    saveSettings();
});

// 音乐结束事件
audio.addEventListener('ended', function() {
    if (modeId === 1) {
        // 单曲循环
        audio.currentTime = 0;
        audio.play().catch(error => {
            console.error('Play error:', error);
        });
    } else if (modeId === 2) {
        // 顺序播放
        musicId = (musicId + 1) % musicData.length;
        initAndPlay(true); // 自动播放下一首
    } else if (modeId === 3) {
        // 随机播放
        const oldId = musicId;
        do {
            musicId = Math.floor(Math.random() * musicData.length);
        } while (musicId === oldId && musicData.length > 1);
        initAndPlay(true); // 自动播放随机歌曲
    } else if (modeId === 4) {
        // 列表循环（与顺序播放相同）
        musicId = (musicId + 1) % musicData.length;
        initAndPlay(true); // 自动播放下一首
    }
});

// 上一首
elements.skipForward.addEventListener('click', function() {
    musicId = (musicId - 1 + musicData.length) % musicData.length;
    initAndPlay(true); // 用户点击，应该自动播放
});

// 下一首
elements.skipBackward.addEventListener('click', function() {
    musicId = (musicId + 1) % musicData.length;
    initAndPlay(true); // 用户点击，应该自动播放
});

// 倍速功能
elements.speed.addEventListener('click', function() {
    currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
    const speed = playbackSpeeds[currentSpeedIndex];
    this.textContent = `${speed}X`;
    audio.playbackRate = speed;
    saveSettings();
});

// 音乐列表点击事件（使用事件委托）
elements.allList.addEventListener('click', function(event) {
    const target = event.target;
    if (target.tagName === 'DIV') {
        const id = target.id;
        if (id.startsWith('music')) {
            musicId = parseInt(id.replace('music', ''));
            initAndPlay(true); // 用户点击，应该自动播放
            // 关闭列表
            elements.musicList.classList.remove('list-card-show');
            elements.musicList.classList.add('list-card-hide');
            elements.closeList.style.display = 'none';
        }
    }
});

// 唱片旋转控制
function refreshRotate() {
    recordImg.classList.add('rotate-play');
}

function rotateRecord() {
    recordImg.style.animationPlayState = 'running';
}

function rotateRecordStop() {
    recordImg.style.animationPlayState = 'paused';
}

// 音量控制
function updateVolume() {
    audio.volume = elements.volumeTogger.value / 100;
}

// 滑块调节音量
elements.volumeTogger.addEventListener('input', function() {
    updateVolume();
    saveSettings();
});

// 点击音量调节设置静音
elements.volume.addEventListener('click', function() {
    if (elements.volumeTogger.value == 0) {
        if (lastVolume == 0) lastVolume = 70;
        elements.volumeTogger.value = lastVolume;
        this.style.backgroundImage = "url('img/音量.png')";
    } else {
        lastVolume = elements.volumeTogger.value;
        elements.volumeTogger.value = 0;
        this.style.backgroundImage = "url('img/静音.png')";
    }
    updateVolume();
    saveSettings();
});

// 初始化
audio.addEventListener('timeupdate', updateProgress);
loadSettings();
initMusic();

// 设置初始音量
updateVolume();

// 键盘快捷键
document.addEventListener('keydown', function(event) {
    // 如果用户正在输入框中输入，不触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(event.code) {
        case 'Space':
            event.preventDefault();
            elements.playPause.click();
            break;
        case 'ArrowLeft':
            event.preventDefault();
            elements.skipForward.click();
            break;
        case 'ArrowRight':
            event.preventDefault();
            elements.skipBackward.click();
            break;
        case 'ArrowUp':
            event.preventDefault();
            elements.volumeTogger.value = Math.min(100, parseInt(elements.volumeTogger.value) + 5);
            updateVolume();
            break;
        case 'ArrowDown':
            event.preventDefault();
            elements.volumeTogger.value = Math.max(0, parseInt(elements.volumeTogger.value) - 5);
            updateVolume();
            break;
        case 'KeyM':
            event.preventDefault();
            elements.volume.click();
            break;
        case 'KeyL':
            event.preventDefault();
            elements.list.click();
            break;
        case 'KeyS':
            event.preventDefault();
            elements.speed.click();
            break;
        case 'KeyD':
            event.preventDefault();
            elements.download.click();
            break;
    }
});

// 初始化播放历史显示
updatePlayHistoryDisplay();

// 添加音频状态监控
function addAudioEventListeners() {
    // 网络状态变化
    audio.addEventListener('waiting', function() {
        console.log('音频等待数据:', {
            networkState: audio.networkState,
            readyState: audio.readyState,
            currentTime: audio.currentTime
        });
    });
    
    audio.addEventListener('canplay', function() {
        console.log('音频可以播放:', {
            networkState: audio.networkState,
            readyState: audio.readyState,
            currentTime: audio.currentTime,
            duration: audio.duration
        });
    });
    
    audio.addEventListener('canplaythrough', function() {
        console.log('音频可以流畅播放:', {
            networkState: audio.networkState,
            readyState: audio.readyState,
            currentTime: audio.currentTime,
            duration: audio.duration
        });
    });
    
    audio.addEventListener('stalled', function() {
        console.log('音频加载停止:', {
            networkState: audio.networkState,
            readyState: audio.readyState
        });
    });
    
    audio.addEventListener('suspend', function() {
        console.log('音频加载暂停:', {
            networkState: audio.networkState,
            readyState: audio.readyState
        });
    });
    
    audio.addEventListener('error', function(e) {
        console.error('音频错误:', e, {
            networkState: audio.networkState,
            readyState: audio.readyState,
            error: e.target.error
        });
    });
}

// 添加音频状态监控
addAudioEventListeners();
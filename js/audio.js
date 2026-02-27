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
    speed: document.getElementById('speed'),
    closeList: document.getElementById('close-list'),
    musicList: document.getElementById('music-list'),
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
    download: document.getElementById('download')
};

const { audio, recordImg } = elements;

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
    const historyContainer = document.getElementById('play-history-container');
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
            historyItem.id = `history-${historyMusicId}`;
            historyItem.textContent = `${musicData[historyMusicId][0]} - ${musicData[historyMusicId][1]}`;
            
            // 添加点击事件
            historyItem.addEventListener('click', function() {
                musicId = historyMusicId;
                initAndPlay();
            });
            
            // 鼠标悬停效果
            historyItem.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgb(27, 37, 30)';
            });
            
            historyItem.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
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
    if (isNaN(audio.duration)) return;
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
    
    audio.onloadedmetadata = function() {
        hideLoading();
        hideError();
        if (isNaN(audio.duration)) return;
        elements.musicTitle.textContent = musicData[musicId][0];
        elements.author.textContent = musicData[musicId][1];
        recordImg.style.backgroundImage = `url('img/record${musicId}.jpg?${Date.now()}')`;
        elements.body.style.backgroundImage = `url('img/bg${musicId}.png?${Date.now()}')`;
        elements.audioTime.textContent = formatTime(audio.duration);
        loadLyrics(musicId);
        audio.currentTime = 0;
        updateProgress();
        refreshRotate();
        updatePlayingIndicator();
        updateFavoriteButton();
        preloadNext();
    };
    
    audio.onerror = function() {
        hideLoading();
        showError(`无法加载音乐: ${musicData[musicId][0]}`);
        console.error('Audio load error:', audio.error);
    };
}

// 初始化并播放
function initAndPlay() {
    initMusic();
    elements.playPause.classList.remove('icon-play');
    elements.playPause.classList.add('icon-pause');
    audio.play();
    rotateRecord();
    addToPlayHistory();
    preloadNext();
    saveSettings();
}

// 播放/暂停切换
elements.playPause.addEventListener('click', function() {
    if (audio.paused) {
        audio.play().catch(error => {
            showError('播放失败，请重试');
            console.error('Play error:', error);
        });
        rotateRecord();
        this.classList.remove('icon-play');
        this.classList.add('icon-pause');
    } else {
        audio.pause();
        rotateRecordStop();
        this.classList.remove('icon-pause');
        this.classList.add('icon-play');
    }
});

// 进度条拖动功能
function handleProgressSeek(event) {
    const pgsWidth = parseFloat(window.getComputedStyle(elements.progressTotal).width);
    const rect = elements.progressTotal.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const rate = Math.max(0, Math.min(1, offsetX / pgsWidth));
    audio.currentTime = audio.duration * rate;
    updateProgress();
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

// 点击列表展开音乐列表
elements.list.addEventListener('click', function() {
    elements.musicList.classList.remove('list-card-hide');
    elements.musicList.classList.add('list-card-show');
    elements.musicList.style.display = 'flex';
    elements.closeList.style.display = 'flex';
});

// 点击关闭面板关闭音乐列表
elements.closeList.addEventListener('click', function() {
    elements.musicList.classList.remove('list-card-show');
    elements.musicList.classList.add('list-card-hide');
    elements.closeList.style.display = 'none';
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
        audio.play();
    } else if (modeId === 2) {
        // 顺序播放
        musicId = (musicId + 1) % musicData.length;
        initAndPlay();
    } else if (modeId === 3) {
        // 随机播放
        const oldId = musicId;
        do {
            musicId = Math.floor(Math.random() * musicData.length);
        } while (musicId === oldId && musicData.length > 1);
        initAndPlay();
    } else if (modeId === 4) {
        // 列表循环（与顺序播放相同）
        musicId = (musicId + 1) % musicData.length;
        initAndPlay();
    }
});

// 上一首
elements.skipForward.addEventListener('click', function() {
    musicId = (musicId - 1 + musicData.length) % musicData.length;
    initAndPlay();
});

// 下一首
elements.skipBackward.addEventListener('click', function() {
    musicId = (musicId + 1) % musicData.length;
    initAndPlay();
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
            initAndPlay();
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
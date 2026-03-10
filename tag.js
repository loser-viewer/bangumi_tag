WidgetMetadata = {
  id: "bangumi_tag_tmdb",
  title: "Bangumi Tag",
  description: "Bangumi 标签浏览 + TMDB匹配",
  author: "hyl",
  site: "https://github.com/quantumultxx/ForwardWidgets",
  version: "1.4",
  requiredVersion: "0.0.1",
  detailCacheDuration: 60,
  modules: [
    // =============BGM模块=============
{
    title: "Bangumi 动画标签",
    description: "按标签、年份、月份浏览动画列表，支持排序和分页。",
    requiresWebView: false,
    functionName: "fetchBangumiTagPage_bg",
    cacheDuration: 3600,
    params: [
        {
            name: "tag_keyword", 
            title: "动画标签 (可留空)", 
            type: "input", 
            description: "输入单个动画标签如 TV, 漫画改, 原创, 搞笑, 战斗等。支持图片中显示的任意标签。留空则浏览热门标签总览。", 
            value: "", 
        },
        {
            name: "sort", 
            title: "排序方式", 
            type: "enumeration", 
            value: "rank",
            enumOptions: [
                { title: "综合排名", value: "rank" },   
                { title: "标注数", value: "collects" }, 
                { title: "日期", value: "date" },     
                { title: "名称", value: "title" }    
            ]
        },
        { name: "page", title: "页码", type: "page" }
        ]
    }
  ]
};

// ===============辅助函数===============
function buildDisplayDescription_bg(releaseDate, description, rating) {
    const parts = [];

    if (releaseDate) {
        parts.push(`日期: ${releaseDate}`);
    }

    if (rating && String(rating).trim() !== "" && String(rating) !== "0" && String(rating) !== "N/A") {
        parts.push(`评分: ${rating}`);
    }

    if (description && String(description).trim() !== "") {
        parts.push(String(description).trim());
    }

    return parts.join(" ｜ ");
}

//===============BGM功能函数===============
const WidgetConfig_bg = {
    MAX_CONCURRENT_DETAILS_FETCH: 16, 
    MAX_CONCURRENT_TMDB_SEARCHES: 8, 
    MAX_CONCURRENT_CALENDAR_ENHANCE: 3,
    MAX_CONCURRENT_TMDB_FULL_DETAILS_FETCH: 3,
    HTTP_RETRIES: 1, 
    HTTP_MAIN_RETRIES: 2,
    HTTP_RETRY_DELAY: 1000, 
    FETCH_FULL_TMDB_DETAILS: false, 
    TMDB_APPEND_TO_RESPONSE: "translations,genres",
    TMDB_SEARCH_STAGE1_YEAR_STRICT_SCORE_BOOST: 12,
    TMDB_SEARCH_STAGE1_HIGH_CONFIDENCE_EXIT_SCORE: 90, 
    CACHE_TTL_MS: 25 * 60 * 1000, 
    PREFETCH_CACHE_TTL_MS: 2 * 60 * 1000,
    MAX_PREFETCHED_PAGES: 5, 
    DEBUG_LOGGING: true, 
    BGM_BASE_URL: "https://bgm.tv", 
    BGM_API_USER_AGENT: `ForwardWidget/1.2 (forward.media.allinone-bangumi_integration) (https://github.com/InchStudio/ForwardWidgets)`, 
    TTL_TRENDS_MS: 6 * 60 * 60 * 1000, 
    TTL_RANK_MS: 24 * 60 * 60 * 1000, 
    TTL_SEASON_EARLY_MS: 12 * 60 * 60 * 1000,
    TTL_SEASON_LATE_MS: 3 * 24 * 60 * 60 * 1000, 
    TTL_ARCHIVE_MS: 7 * 24 * 60 * 60 * 1000, 
    TTL_CALENDAR_API_MS: 6 * 60 * 60 * 1000, 
    TTL_CALENDAR_ITEM_ENHANCED_MS: 24 * 60 * 60 * 1000,
    TTL_BGM_DETAIL_COVER_MS: 7 * 24 * 60 * 60 * 1000,
    TTL_TMDB_FULL_DETAIL_MS: 24 * 60 * 60 * 1000,
    SEASON_EARLY_WEEKS: 6, 
    MAX_TOTAL_TMDB_QUERIES_TO_PROCESS: 4,
    TMDB_ANIMATION_GENRE_ID: 16,
    TMDB_SCORE_WEIGHT_TITLE: 5.0,
    TMDB_SCORE_WEIGHT_ALIAS: 3.0, 
    TMDB_SCORE_WEIGHT_YEAR: 4.0,
    TMDB_SCORE_WEIGHT_TYPE: 4.0,
    TMDB_SCORE_WEIGHT_LANG: 1.5,
    TMDB_SCORE_WEIGHT_GENRE: 3.0,
    TMDB_SCORE_WEIGHT_SUMMARY: 0.5,
    TMDB_SCORE_WEIGHT_POPULAR: 0.2,
    TMDB_SCORE_WEIGHT_VOTES: 0.2,
    TMDB_SEARCH_YEAR_TOLERANCE_TV: 1,
    TMDB_SEARCH_MIN_SCORE_THRESHOLD: 50, 
    TMDB_PENALTY_LOW_VOTES_VS_BGM_RAW: -150, 
    TMDB_THRESHOLD_LOW_VOTES: 10,
    BGM_THRESHOLD_SIGNIFICANT_VOTES: 50,
    TMDB_PENALTY_NO_CHINESE_OVERVIEW_RAW: -75,
    BGM_USE_BGMD_INDEX: true, 
    TTL_BGMD_INDEX_MS: 24 * 60 * 60 * 1000,
    BGMD_INDEX_URL: "https://unpkg.com/bgmd@0.0.61/data/index.json", 
    BGM_BASE_URL: "https://bgm.tv", 
    BGM_API_BASE_URL: "https://api.bgm.tv",
    BGM_BROWSE_URL: "https://bangumi.tv", 
};

const CONSTANTS_bg = {
    SCRIPT_VERSION: "6.7.0_aio_bgmd_integration", 
    LOG_PREFIX_GENERAL: `[BGM_AIO_INTEGRATION v6.7.0_aio]`,
    CACHE_KEYS: {
        TMDB_SEARCH: `tmdb_search_computed_bg_v6.7.0_aio`,
        ITEM_DETAIL_COMPUTED: `item_detail_computed_bg_v6.7.0_aio_final`,
        BGM_CALENDAR_API: `bgm_calendar_api_data_bg_v6.7.0_aio`,
        CALENDAR_ITEM_FINAL_DISPLAY: `calendar_item_final_display_bg_v6.7.0_aio`,
        BGM_DETAIL_COVER: `bgm_detail_cover_bg_v6.7.0_aio`,
        TMDB_FULL_DETAIL: `tmdb_full_detail_bg_v6.7.0_aio`,
        BGMD_INDEX_DATA: `bgmd_index_data_v6.7.0_aio`, 
    },
    MEDIA_TYPES: { 
        TV: "tv",
        MOVIE: "movie",
        ANIME: "anime", 
    },
    TMDB_ANIMATION_GENRE_ID: WidgetConfig_bg.TMDB_ANIMATION_GENRE_ID,
    BGM_API_TYPE_MAPPING: { 2: "anime" },
    JS_DAY_TO_BGM_API_ID: { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 },
    REGION_FILTER_US_EU_COUNTRIES: ["US", "GB", "FR", "DE", "CA", "AU", "ES", "IT"],
    SHORT_FILM_KEYWORDS: ["短片", "short film", "short", "动画短片", "short animation", "ショートフィルム", "短篇"], 
};

const CacheUtil_bg = {
    cache: new Map(),
    pendingPromises: new Map(),
    _generateKey: function(type, identifier) {
        if (typeof identifier === 'object' && identifier !== null) {
            try {
                return `${type}_${JSON.stringify(Object.keys(identifier).sort().reduce((obj, key) => { obj[key] = identifier[key]; return obj; }, {}))}`;
            } catch (e) {
                if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 生成对象标识符缓存键失败:`, identifier, e.message);
                let fallbackKeyPart = '';
                if (typeof identifier === 'object' && !Array.isArray(identifier)) {
                    try {
                        Object.keys(identifier).sort().forEach(k => {
                            fallbackKeyPart += `_${k}:${String(identifier[k])}`;
                        });
                        if (fallbackKeyPart) return `${type}${fallbackKeyPart}`;
                    } catch (fallbackError) {
                         if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 回退缓存键生成失败:`, fallbackError.message);
                    }
                }
                console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 严重错误: 使用可能非唯一的备用缓存键，标识符为:`, identifier);
                return `${type}_${String(identifier)}_ERROR_POTENTIALLY_NON_UNIQUE`;
            }
        }
        return `${type}_${String(identifier)}`;
    },
    get: function(type, identifier) {
        const key = this._generateKey(type, identifier);
        if (this.pendingPromises.has(key)) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 等待进行中Promise: ${key.substring(0, 80)}...`);
            return this.pendingPromises.get(key);
        }
        const entry = this.cache.get(key);
        if (entry && Date.now() < entry.expiry) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 命中缓存: ${key.substring(0, 80)}...`);
            return Promise.resolve(entry.value);
        } else if (entry) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 缓存过期: ${key.substring(0, 80)}...`);
            this.cache.delete(key);
            this.pendingPromises.delete(key);
        }
        return null;
    },
    set: function(type, identifier, valuePromise, customTtl) {
        const key = this._generateKey(type, identifier);
        this.pendingPromises.set(key, valuePromise);
        const ttlToUse = typeof customTtl === 'number' ? customTtl : WidgetConfig_bg.CACHE_TTL_MS;

        return valuePromise.then(value => {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] 设置缓存: ${key.substring(0, 80)}... (TTL: ${ttlToUse / 1000}s)`);
            this.cache.set(key, { value: value, expiry: Date.now() + ttlToUse });
            this.pendingPromises.delete(key);
            return value;
        }).catch(error => {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [缓存工具] Promise执行失败，从pending移除: ${key.substring(0, 80)}...`, error.message);
            this.pendingPromises.delete(key);
            throw error;
        });
    },
    cachedOrFetch: function(cacheType, identifier, fetchFn, options = {}) {
        const cachedPromise = this.get(cacheType, identifier);
        if (cachedPromise) return cachedPromise;
        
        let ttl = options.ttl;
        if (typeof options.calculateTTL === 'function') {
            ttl = options.calculateTTL(options.ttlIdentifier || identifier, options.context || {});
        }
        return this.set(cacheType, identifier, fetchFn(), ttl);
    }
};

const PrefetchCache_bg = {
    prefetchedHtml: new Map(),
    get: function(url) {
        const entry = this.prefetchedHtml.get(url);
        if (entry && (Date.now() - entry.timestamp < WidgetConfig_bg.PREFETCH_CACHE_TTL_MS)) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 命中: ${url}`);
            return entry.promise;
        }
        if (entry) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 过期或无效: ${url}`);
            this.prefetchedHtml.delete(url);
        }
        return null;
    },
    set: function(url, htmlPromise) {
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 开始预取并设置Promise: ${url}`);
        const entry = { promise: htmlPromise, timestamp: Date.now(), inProgress: true };
        this.prefetchedHtml.set(url, entry);

        htmlPromise.finally(() => { 
             const currentEntry = this.prefetchedHtml.get(url);
             if (currentEntry === entry) { 
                currentEntry.inProgress = false;
                htmlPromise.catch(() => {
                    if (this.prefetchedHtml.get(url) === entry) {
                        this.prefetchedHtml.delete(url);
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 预取失败后删除条目: ${url}`);
                    }
                });
             }
        });
        if (this.prefetchedHtml.size > WidgetConfig_bg.MAX_PREFETCHED_PAGES) {
            let oldestKey = null; let oldestTime = Infinity;
            for (const [key, value] of this.prefetchedHtml.entries()) {
                if (!value.inProgress && value.timestamp < oldestTime) {
                    oldestTime = value.timestamp;
                    oldestKey = key;
                }
            }
            if (oldestKey) {
                this.prefetchedHtml.delete(oldestKey);
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 清理最旧条目: ${oldestKey}`);
            }
        }
        return htmlPromise;
    },
    fetchAndCacheHtml: function(url, headers) {
        let existingEntry = this.prefetchedHtml.get(url);
        if (existingEntry && (existingEntry.inProgress || (Date.now() - existingEntry.timestamp < WidgetConfig_bg.PREFETCH_CACHE_TTL_MS))) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 使用现有预取Promise: ${url}`);
            return existingEntry.promise;
        }
        if (existingEntry) { 
             this.prefetchedHtml.delete(url);
        }
        const newHtmlPromise = fetchWithRetry_bg(url, { headers }, 'get', false, WidgetConfig_bg.HTTP_RETRIES) 
            .then(response => {
                if (!response?.data) throw new Error(`预取 ${url} 无有效数据`);
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 预取成功，获得HTML: ${url}`);
                return response.data;
            })
            .catch(err => {              
                if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [预取缓存] 预取网络请求失败 ${url}: ${err.message}`);
                throw err;
            });
        return this.set(url, newHtmlPromise); 
    }
};

async function fetchWithRetry_bg(url, options, method = 'get', isTmdb = false, customRetries) {
    let attempts = 0;
    const maxRetries = customRetries !== undefined ? customRetries : WidgetConfig_bg.HTTP_MAIN_RETRIES; 
    const retryDelay = WidgetConfig_bg.HTTP_RETRY_DELAY;
    const providedAccessToken = options?.bangumiAccessToken; 
    

    while (attempts <= maxRetries) {
        try {
            if (WidgetConfig_bg.DEBUG_LOGGING && attempts > 0) {
                console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [HTTP] 第 ${attempts + 1} 次尝试 ${url.substring(0, 80)}...`);
            }
            const api = isTmdb ? Widget.tmdb : Widget.http; 

            const currentOptions = { ...options }; 
            delete currentOptions.bangumiAccessToken;
            currentOptions.headers = { ...(options.headers || {}) }; 

            if (!isTmdb) { 
                if (url.startsWith(WidgetConfig_bg.BGM_API_BASE_URL) && providedAccessToken) {
                    currentOptions.headers["Authorization"] = `Bearer ${providedAccessToken}`;
                    if (WidgetConfig_bg.DEBUG_LOGGING) {
                        console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [HTTP] Added Authorization header for Bangumi API request to: ${url.substring(0,80)}...`);
                    }
                }

                if (url.startsWith(WidgetConfig_bg.BGM_BROWSE_URL) || url.startsWith(WidgetConfig_bg.BGM_API_BASE_URL)) {
                    if (!currentOptions.headers["User-Agent"]) { 
                        currentOptions.headers["User-Agent"] = WidgetConfig_bg.BGM_API_USER_AGENT;
                    }
                }
            }
            
            if (WidgetConfig_bg.DEBUG_LOGGING && currentOptions.headers?.Authorization) {
                 console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [HTTP Pre-Flight] Requesting URL: ${url.substring(0,100)} WITH Authorization Header.`);
            } else if (WidgetConfig_bg.DEBUG_LOGGING) {
                 console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [HTTP Pre-Flight] Requesting URL: ${url.substring(0,100)}. Headers: ${JSON.stringify(currentOptions.headers)}`);
            }

            const response = await api[method](url, currentOptions);
            
            if (isTmdb && response && response.data === undefined && typeof response === 'object' && response !== null) {
                 return response; 
            }
            return response; 

        } catch (error) {
            attempts++;
            const isAuthError = String(error.message).includes("401") || String(error.message).includes("403");

            if (WidgetConfig_bg.DEBUG_LOGGING || attempts > maxRetries || isAuthError) {
                console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [HTTP] 获取 ${url.substring(0, 80)}... 错误 (尝试 ${attempts}/${maxRetries + 1}):`, error.message);
            }

            if (isAuthError) throw error; 
            if (attempts > maxRetries) throw error; 
            
            const delayMultiplier = attempts; 
            await new Promise(resolve => setTimeout(resolve, retryDelay * delayMultiplier));
        }
    }
    throw new Error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [HTTP] 达到最大重试次数 ${url}`); 
}

function isEarlySeason_bg(year, month, currentDate = new Date()) {
    if (!year || !month || month === 'all' || year === '' || month === '') return false;
    const currentYear = currentDate.getFullYear();
    const seasonYear = parseInt(year, 10);
    const seasonStartMonth = parseInt(month, 10);
    if (isNaN(seasonYear) || isNaN(seasonStartMonth)) return false;
    if (currentYear < seasonYear) return false; 
    const seasonStartDate = new Date(seasonYear, seasonStartMonth - 1, 1);
    const earlySeasonEndDate = new Date(seasonStartDate);
    earlySeasonEndDate.setDate(seasonStartDate.getDate() + WidgetConfig_bg.SEASON_EARLY_WEEKS * 7);
    return currentDate >= seasonStartDate && currentDate <= earlySeasonEndDate;
}

function calculateContentTTL_bg(identifier, context) {
    const { category, year, month, sort } = identifier; 
    const currentDate = context.currentDate || new Date();
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 传入标识符:`, identifier);

    if (sort === 'trends') return WidgetConfig_bg.TTL_TRENDS_MS;
    
    if (year && year !== "" && month && month !== "" && month !== 'all') { 
        if (isEarlySeason_bg(year, month, currentDate)) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 使用季度早期TTL for ${year}-${month}`);
            return WidgetConfig_bg.TTL_SEASON_EARLY_MS;
        } else {
            const seasonStartDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
            const monthsSinceSeasonStart = (currentDate.getFullYear() - seasonStartDate.getFullYear()) * 12 + (currentDate.getMonth() - seasonStartDate.getMonth());
            if (monthsSinceSeasonStart > 6) { 
                 if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 使用存档TTL for ${year}-${month}`);
                 return WidgetConfig_bg.TTL_ARCHIVE_MS;
            }
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 使用季度后期TTL for ${year}-${month}`);
            return WidgetConfig_bg.TTL_SEASON_LATE_MS;
        }
    } else if (year && year !== "") { 
        if (parseInt(year,10) < currentDate.getFullYear() -1) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 使用存档TTL for year ${year}`);
            return WidgetConfig_bg.TTL_ARCHIVE_MS; 
        }
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 使用排行TTL for year ${year}`);
        return WidgetConfig_bg.TTL_RANK_MS; 
    }
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TTL计算] 使用默认排行TTL`);
    return WidgetConfig_bg.TTL_RANK_MS; 
}

function normalizeTmdbQuery_bg(query) { if (!query || typeof query !== 'string') return ""; return query.toLowerCase().trim().replace(/[\\[\\]【】（）()「」『』:：\\-－_,\\.\\・]/g, ' ').replace(/\\s+/g, ' ').trim();}
function getInfoFromBox_bg($, labelText) { let value = '';const listItems = $('#infobox li');for (let i = 0; i < listItems.length; i++) { const liElement = listItems.eq(i); const tipSpan = liElement.find('span.tip').first(); if (tipSpan.text().trim() === labelText) { value = liElement.clone().children('span.tip').remove().end().text().trim(); return value; } } return value; }
function parseDate_bg(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    dateStr = dateStr.trim();

    let match;

    match = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
    }

    match = dateStr.match(/^(\d{4})年(\d{1,2})月(?!日)/);
    if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-01`;
    }

    match = dateStr.match(/^(\d{4})年(冬|春|夏|秋)/);
    if (match) {
        let m = '01';
        if (match[2] === '春') m = '04';
        else if (match[2] === '夏') m = '07';
        else if (match[2] === '秋') m = '10';
        return `${match[1]}-${m}-01`;
    }

    match = dateStr.match(/^(\d{4})年(?![\d月春夏秋冬])/);
    if (match) {
        return `${match[1]}-01-01`;
    }

    match = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
    }

    match = dateStr.match(/^(\d{4})[-/](\d{1,2})(?!.*[-/])/);
    if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-01`;
    }

    match = dateStr.match(/^(\d{4})$/);
    if (match) {
        return `${match[1]}-01-01`;
    }

    if (WidgetConfig_bg.DEBUG_LOGGING && dateStr) {
        console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [日期解析] 无法解析日期字符串: "${dateStr}"`);
    }

    return '';
}

function populateItemFromTmdbFullDetail_bg(itemRef, tmdbDetail) {
    if (!tmdbDetail) {
        if (WidgetConfig_bg.DEBUG_LOGGING) {
            console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB填充工具] 未提供TMDB详情对象（TMDB ID ${itemRef.tmdb_id || 'N/A'}, BGM ID ${itemRef.link?.split('/').pop() || itemRef.id}）。`);
        }
        return;
    }

    const newReleaseDate =
        parseDate_bg(tmdbDetail.release_date || tmdbDetail.first_air_date) || itemRef.releaseDate;

    const newRating =
        tmdbDetail.vote_average ? tmdbDetail.vote_average.toFixed(1) : itemRef.rating;

    itemRef.releaseDate = newReleaseDate;
    itemRef.rating = newRating;
    itemRef.tmdb_overview = tmdbDetail.overview || itemRef.tmdb_overview || "";

    const currentDescription = String(itemRef.description || "");
    const baseDescription = currentDescription
        .replace(/^日期:\s*[^｜|]+[｜|]?\s*/g, "")
        .replace(/^评分:\s*[^｜|]+[｜|]?\s*/g, "")
        .trim();

    itemRef.description = buildDisplayDescription_bg(
        newReleaseDate,
        tmdbDetail.overview || baseDescription,
        newRating
    );

    if (tmdbDetail.genres?.length > 0) {
        itemRef.tmdb_genres = tmdbDetail.genres.map(g => g.name).join(', ');
        itemRef.genreTitle = itemRef.tmdb_genres;
    }

    itemRef.tmdb_tagline = tmdbDetail.tagline || "";
    itemRef.tmdb_status = tmdbDetail.status || "";
    itemRef.tmdb_original_title = tmdbDetail.original_title || tmdbDetail.original_name || "";

    if (tmdbDetail.origin_country && Array.isArray(tmdbDetail.origin_country) && tmdbDetail.origin_country.length > 0) {
        itemRef.tmdb_origin_countries = tmdbDetail.origin_country;
    } else if (tmdbDetail.production_countries && Array.isArray(tmdbDetail.production_countries) && tmdbDetail.production_countries.length > 0) {
        itemRef.tmdb_origin_countries = tmdbDetail.production_countries.map(pc => pc.iso_3166_1);
    } else if (!itemRef.tmdb_origin_countries || itemRef.tmdb_origin_countries.length === 0) {
        itemRef.tmdb_origin_countries = [];
    }

    if (typeof tmdbDetail.vote_count === 'number') {
        itemRef.tmdb_vote_count = tmdbDetail.vote_count;
    }

    let bestChineseTitleFromTmdb = '';
    if (tmdbDetail.translations?.translations) {
        const chineseTranslation = tmdbDetail.translations.translations.find(
            t => t.iso_639_1 === 'zh' && t.iso_3166_1 === 'CN' && t.data && (t.data.title || t.data.name)
        );
        if (chineseTranslation) {
            bestChineseTitleFromTmdb = (chineseTranslation.data.title || chineseTranslation.data.name).trim();
        }
    }

    itemRef.tmdb_preferred_title = bestChineseTitleFromTmdb || itemRef.title;
    if (bestChineseTitleFromTmdb && bestChineseTitleFromTmdb !== itemRef.title) {
        if (WidgetConfig_bg.DEBUG_LOGGING) {
            console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB填充工具] 更新 TMDB ID ${itemRef.tmdb_id} 的主标题为 TMDB 中文翻译: "${bestChineseTitleFromTmdb.substring(0,30)}..." (原 BGM 链接 ID: ${itemRef.link?.split('/').pop() || 'N/A'})`);
        }
        itemRef.title = bestChineseTitleFromTmdb;
    }

    if (WidgetConfig_bg.DEBUG_LOGGING) {
        console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB填充工具] 条目 (TMDB ID ${itemRef.tmdb_id}) 已从完整详情填充。`);
    }
}

function scoreTmdbResult_bg(result, query, validYear, searchMediaType, originalTitle, chineseTitle, isLikelyMovieOrShort = false, isShortFilm = false) {

    const bgmItemData = {
        originalTitle_bgm: originalTitle,
        chineseTitle_bgm: chineseTitle,
        year_bgm: validYear, 
        searchMediaType_bgm: searchMediaType,
        isLikelyMovieOrShort_bgm: isLikelyMovieOrShort,
        isShortFilm_bgm: isShortFilm,
    };

    const scoringResult = calculateTmdbMatchScore_bg(result, bgmItemData, WidgetConfig_bg);
    
    return scoringResult.totalScore;
}

function calculateTmdbMatchScore_bg(tmdbResult, bgmItemData, widgetConfig) {
    let totalScore = 0;
    const scoreDetails = {
        title: { score: 0, weightedScore: 0, details: "" },
        alias: { score: 0, weightedScore: 0, details: "(Not implemented)" },
        year: { score: 0, weightedScore: 0, details: "" },
        type: { score: 0, weightedScore: 0, details: "" },
        lang: { score: 0, weightedScore: 0, details: "" },
        genre: { score: 0, weightedScore: 0, details: "" },
        summary: { score: 0, weightedScore: 0, details: "(Not implemented)" },
        popularity: { score: 0, weightedScore: 0, details: "" },
        votes: { score: 0, weightedScore: 0, details: "" },
        adult: { score: 0, weightedScore: 0, details: "" },
        quality: { score: 0, details: "" } 
    };

    const { originalTitle_bgm, chineseTitle_bgm, year_bgm, searchMediaType_bgm, isLikelyMovieOrShort_bgm, isShortFilm_bgm, bgm_rating_total, bgm_summary_exists_in_chinese, bgm_id_for_log } = bgmItemData;

    const resultTitleLower = normalizeTmdbQuery_bg(tmdbResult.title || tmdbResult.name);
    const resultOriginalTitleLower = normalizeTmdbQuery_bg(tmdbResult.original_title || tmdbResult.original_name);
    const queryLower_original = normalizeTmdbQuery_bg(originalTitle_bgm);
    const queryLower_chinese = normalizeTmdbQuery_bg(chineseTitle_bgm);
    
    let titleRawScore = 0;
    if ((queryLower_original && (resultTitleLower === queryLower_original || resultOriginalTitleLower === queryLower_original)) || 
        (queryLower_chinese && (resultTitleLower === queryLower_chinese || resultOriginalTitleLower === queryLower_chinese))) {
        titleRawScore = 100; 
        scoreDetails.title.details = `Exact match with BGM title. BGM(orig: ${queryLower_original}, cn: ${queryLower_chinese}), TMDB(res: ${resultTitleLower}, orig: ${resultOriginalTitleLower})`;
    } else if ((queryLower_original && (resultTitleLower.includes(queryLower_original) || resultOriginalTitleLower.includes(queryLower_original))) || 
               (queryLower_chinese && (resultTitleLower.includes(queryLower_chinese) || resultOriginalTitleLower.includes(queryLower_chinese)))) {
        titleRawScore = 60; 
        scoreDetails.title.details = `Contains BGM title. BGM(orig: ${queryLower_original}, cn: ${queryLower_chinese}), TMDB(res: ${resultTitleLower}, orig: ${resultOriginalTitleLower})`;
    } else {
        const bgmWords = new Set([...(queryLower_original?.split(/\s+/) || []), ...(queryLower_chinese?.split(/\s+/) || [])].filter(w => w.length > 1));
        if (bgmWords.size > 0) {
            const tmdbWords = new Set([...resultTitleLower.split(/\s+/), ...resultOriginalTitleLower.split(/\s+/)].filter(w => w.length > 1));
            let commonWords = 0;
            bgmWords.forEach(bw => { if (tmdbWords.has(bw)) commonWords++; });
            titleRawScore = (commonWords / bgmWords.size) * 40; 
            scoreDetails.title.details = `Word overlap: ${commonWords}/${bgmWords.size} words. BGM(orig: ${queryLower_original}, cn: ${queryLower_chinese}), TMDB(res: ${resultTitleLower}, orig: ${resultOriginalTitleLower})`;
        } else {
            titleRawScore = 0;
            scoreDetails.title.details = `No title match/overlap. BGM(orig: ${queryLower_original}, cn: ${queryLower_chinese}), TMDB(res: ${resultTitleLower}, orig: ${resultOriginalTitleLower})`;
        }
    }
    scoreDetails.title.score = titleRawScore;
    scoreDetails.title.weightedScore = titleRawScore * widgetConfig.TMDB_SCORE_WEIGHT_TITLE;
    totalScore += scoreDetails.title.weightedScore;

    const tmdbDate = tmdbResult.release_date || tmdbResult.first_air_date;
    const tmdbYearStr = tmdbDate ? tmdbDate.substring(0, 4) : null;
    const tmdbYear = tmdbYearStr && /^\d{4}$/.test(tmdbYearStr) ? parseInt(tmdbYearStr, 10) : null;
    const bgmYear = year_bgm && /^\d{4}$/.test(String(year_bgm)) ? parseInt(String(year_bgm), 10) : null;
    let yearRawScore = 0;

    if (bgmYear) {
        if (tmdbYear) {
            const yearDiff = Math.abs(tmdbYear - bgmYear);
            if (isShortFilm_bgm) {
                yearRawScore = (yearDiff === 0) ? 100 : -200; 
                scoreDetails.year.details = `Short film. BGM Year: ${bgmYear}, TMDB Year: ${tmdbYear}. Diff: ${yearDiff}. Raw score: ${yearRawScore}`;
            } else {
                const tolerance = searchMediaType_bgm === CONSTANTS_bg.MEDIA_TYPES.TV ? widgetConfig.TMDB_SEARCH_YEAR_TOLERANCE_TV : 0; 
                if (yearDiff <= tolerance) yearRawScore = 100 - (yearDiff * 30); 
                else yearRawScore = -50 - (yearDiff * 10); 
                scoreDetails.year.details = `Type: ${searchMediaType_bgm}. BGM Year: ${bgmYear}, TMDB Year: ${tmdbYear}. Diff: ${yearDiff}, Tolerance: ${tolerance}. Raw score: ${yearRawScore}`;
            }
        } else { 
            yearRawScore = isShortFilm_bgm ? -150 : -80;
            scoreDetails.year.details = `BGM Year: ${bgmYear}, TMDB Year: N/A. Raw score: ${yearRawScore}`;
        }
    } else { 
        if (tmdbYear) { 
            yearRawScore = isShortFilm_bgm ? -100 : -30;
            scoreDetails.year.details = `BGM Year: N/A, TMDB Year: ${tmdbYear}. Raw score: ${yearRawScore}`;
        } else { 
            yearRawScore = 10; 
            scoreDetails.year.details = `BGM Year: N/A, TMDB Year: N/A. Raw score: ${yearRawScore}`;
        }
    }
    scoreDetails.year.score = yearRawScore;
    scoreDetails.year.weightedScore = yearRawScore * widgetConfig.TMDB_SCORE_WEIGHT_YEAR;
    totalScore += scoreDetails.year.weightedScore;

    
    let typeRawScore = 0;
    const tmdbMediaType = (tmdbResult.media_type || (tmdbResult.title ? 'movie' : (tmdbResult.name ? 'tv' : 'unknown'))).toLowerCase();
    if (searchMediaType_bgm === tmdbMediaType) {
        typeRawScore = 100;
        scoreDetails.type.details = `Exact type match: ${searchMediaType_bgm}. Raw score: ${typeRawScore}`;
    } else {
        typeRawScore = -100; 
        scoreDetails.type.details = `Type mismatch: BGM SearchType=${searchMediaType_bgm}, TMDB Type=${tmdbMediaType}. Raw score: ${typeRawScore}`;
    }
    scoreDetails.type.score = typeRawScore;
    scoreDetails.type.weightedScore = typeRawScore * widgetConfig.TMDB_SCORE_WEIGHT_TYPE;
    totalScore += scoreDetails.type.weightedScore;

    let genreRawScore = 0;
    const isTmdbAnimation = tmdbResult.genre_ids && tmdbResult.genre_ids.includes(widgetConfig.TMDB_ANIMATION_GENRE_ID);
    if (searchMediaType_bgm === CONSTANTS_bg.MEDIA_TYPES.TV) {
        if (isTmdbAnimation) {
            genreRawScore = 100;
            scoreDetails.genre.details = `TV search, TMDB is Animation. Raw score: ${genreRawScore}`;
        } else {
            genreRawScore = -200; 
            scoreDetails.genre.details = `TV search, TMDB is NOT Animation (Genre IDs: ${JSON.stringify(tmdbResult.genre_ids)}). Raw score: ${genreRawScore}`;
        }
    } else { 
        genreRawScore = isTmdbAnimation ? 50 : 0;
        scoreDetails.genre.details = `Movie search. TMDB Animation: ${isTmdbAnimation}. Raw score: ${genreRawScore}`;
    }
    scoreDetails.genre.score = genreRawScore;
    scoreDetails.genre.weightedScore = genreRawScore * widgetConfig.TMDB_SCORE_WEIGHT_GENRE;
    totalScore += scoreDetails.genre.weightedScore;

    let langRawScore = 0;
    if (tmdbResult.original_language === 'ja' && searchMediaType_bgm !== CONSTANTS_bg.MEDIA_TYPES.MOVIE) { 
        langRawScore = 50; 
        scoreDetails.lang.details = `TMDB lang is 'ja'. Raw score: ${langRawScore}`;
    }
    scoreDetails.lang.score = langRawScore;
    scoreDetails.lang.weightedScore = langRawScore * widgetConfig.TMDB_SCORE_WEIGHT_LANG;
    totalScore += scoreDetails.lang.weightedScore;

    const popScore = Math.log10((tmdbResult.popularity || 0) + 1);
    scoreDetails.popularity.score = popScore;
    scoreDetails.popularity.weightedScore = popScore * widgetConfig.TMDB_SCORE_WEIGHT_POPULAR;
    totalScore += scoreDetails.popularity.weightedScore;
    scoreDetails.popularity.details = `Popularity: ${tmdbResult.popularity}, Raw log score: ${popScore.toFixed(2)}`;

    const voteScore = Math.log10((tmdbResult.vote_count || 0) + 1);
    scoreDetails.votes.score = voteScore;
    scoreDetails.votes.weightedScore = voteScore * widgetConfig.TMDB_SCORE_WEIGHT_VOTES;
    totalScore += scoreDetails.votes.weightedScore;
    scoreDetails.votes.details = `Vote Count: ${tmdbResult.vote_count}, Raw log score: ${voteScore.toFixed(2)}`;
    
    scoreDetails.adult.score = 0; 
    scoreDetails.adult.weightedScore = 0;
    scoreDetails.adult.details = "Adult content penalty removed. Adult status no longer negatively impacts score.";

    let qualityAdjustment = 0;
    const tmdbVoteCount = tmdbResult.vote_count || 0;
    const bgmRatingTotalNum = parseInt(bgm_rating_total || 0, 10);

    if (tmdbVoteCount < widgetConfig.TMDB_THRESHOLD_LOW_VOTES && bgmRatingTotalNum > widgetConfig.BGM_THRESHOLD_SIGNIFICANT_VOTES) {
        const voteMismatchPenalty = widgetConfig.TMDB_PENALTY_LOW_VOTES_VS_BGM_RAW;
        qualityAdjustment += voteMismatchPenalty;
        scoreDetails.quality.details += `Low TMDB votes (${tmdbVoteCount}) vs significant BGM votes (${bgmRatingTotalNum}). Penalty: ${voteMismatchPenalty}. `;
    }

    const hasChineseOverviewInTmdbSearch = (tmdbResult.overview && /[\u4e00-\u9fa5]/.test(tmdbResult.overview));
    
    if (!hasChineseOverviewInTmdbSearch && bgm_summary_exists_in_chinese && 
        tmdbResult.original_language && !['zh', 'ko', 'ja', 'yue'].includes(tmdbResult.original_language.toLowerCase())) { 
        const overviewPenalty = widgetConfig.TMDB_PENALTY_NO_CHINESE_OVERVIEW_RAW;
        qualityAdjustment += overviewPenalty;
        scoreDetails.quality.details += `Missing Chinese overview in TMDB (lang: ${tmdbResult.original_language}, overview: ${tmdbResult.overview ? tmdbResult.overview.substring(0,30)+'...' : 'N/A'}) while BGM has one. Penalty: ${overviewPenalty}. `;
    }
    
    if (qualityAdjustment !== 0) {
        totalScore += qualityAdjustment;
        scoreDetails.quality.score = qualityAdjustment; 
        if (widgetConfig.DEBUG_LOGGING) {
            console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB Quality Adj.] BGM(ID: ${bgm_id_for_log || 'N/A'}) TMDB(ID:${tmdbResult.id}) Adjustment: ${qualityAdjustment.toFixed(0)}. Details: ${scoreDetails.quality.details}`);
        }
    }

    if (widgetConfig.DEBUG_LOGGING) {
        console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB Score Details] BGM(oT:${originalTitle_bgm?.substring(0,15)},cT:${chineseTitle_bgm?.substring(0,15)},y:${year_bgm},m:${searchMediaType_bgm},isSF:${isShortFilm_bgm}) -> TMDB(ID:${tmdbResult.id}, T:'${(tmdbResult.title||tmdbResult.name)?.substring(0,20)}',y:${tmdbYear})`);
        let summaryLog = `${CONSTANTS_bg.LOG_PREFIX_GENERAL} Scores: Title=${scoreDetails.title.weightedScore.toFixed(1)}(${scoreDetails.title.score.toFixed(0)}*${widgetConfig.TMDB_SCORE_WEIGHT_TITLE})`;
        summaryLog += `, Year=${scoreDetails.year.weightedScore.toFixed(1)}(${scoreDetails.year.score.toFixed(0)}*${widgetConfig.TMDB_SCORE_WEIGHT_YEAR})`;
        summaryLog += `, Type=${scoreDetails.type.weightedScore.toFixed(1)}(${scoreDetails.type.score.toFixed(0)}*${widgetConfig.TMDB_SCORE_WEIGHT_TYPE})`;
        summaryLog += `, Genre=${scoreDetails.genre.weightedScore.toFixed(1)}(${scoreDetails.genre.score.toFixed(0)}*${widgetConfig.TMDB_SCORE_WEIGHT_GENRE})`;
        summaryLog += `, Lang=${scoreDetails.lang.weightedScore.toFixed(1)}(${scoreDetails.lang.score.toFixed(0)}*${widgetConfig.TMDB_SCORE_WEIGHT_LANG})`;
        summaryLog += `, Pop=${scoreDetails.popularity.weightedScore.toFixed(1)}(${scoreDetails.popularity.score.toFixed(1)}*${widgetConfig.TMDB_SCORE_WEIGHT_POPULAR})`;
        summaryLog += `, Votes=${scoreDetails.votes.weightedScore.toFixed(1)}(${scoreDetails.votes.score.toFixed(1)}*${widgetConfig.TMDB_SCORE_WEIGHT_VOTES})`;
        summaryLog += `, Adult=${scoreDetails.adult.score.toFixed(0)}`; 
        summaryLog += ` | TOTAL SCORE: ${totalScore.toFixed(2)}`;
        console.log(summaryLog);
    }

    return { totalScore: totalScore, details: scoreDetails };
}

function generateTmdbSearchQueries_bg(originalTitle, chineseTitle, listTitle) {
    const coreQueries = new Set();
    const refineQueryForSearch = (text) => {
        if (!text || typeof text !== 'string') return "";
        let refined = text.trim();
        refined = refined.replace(/\s*\((\d{4}|S\d{1,2}|Season\s*\d{1,2}|第[一二三四五六七八九十零〇]+[季期部篇章])\)/gi, ''); 
        refined = refined.replace(/\s*\[(\d{4}|S\d{1,2}|Season\s*\d{1,2}|第[一二三四五六七八九十零〇]+[季期部篇章])\]/gi, ''); 
        refined = refined.replace(/\s*【(\d{4}|S\d{1,2}|Season\s*\d{1,2}|第[一二三四五六七八九十零〇]+[季期部篇章])】/gi, ''); 
        return normalizeTmdbQuery_bg(refined);
    };
    const addQueryToList = (text, list) => {
        if (!text || typeof text !== 'string') return;
        const refinedBase = refineQueryForSearch(text);
        if (refinedBase) list.add(refinedBase);
        const originalNormalized = normalizeTmdbQuery_bg(text);
        if (originalNormalized && originalNormalized !== refinedBase) list.add(originalNormalized);
        const firstPartOriginal = normalizeTmdbQuery_bg(text.split(/[:：\-\s（(【[]/)[0].trim()); 
        if (firstPartOriginal) list.add(firstPartOriginal);
        const noSeasonSuffix = normalizeTmdbQuery_bg(text.replace(/第.+[期季部篇章]$/g, '').trim());
        if (noSeasonSuffix && noSeasonSuffix !== originalNormalized && noSeasonSuffix !== refinedBase) list.add(noSeasonSuffix);
    };
    addQueryToList(originalTitle, coreQueries);
    addQueryToList(chineseTitle, coreQueries);
    addQueryToList(listTitle, coreQueries);
    [originalTitle, chineseTitle, listTitle].forEach(t => { if (t) { const normalized = normalizeTmdbQuery_bg(t); if (normalized) coreQueries.add(normalized); } });
    let queriesToProcess = Array.from(coreQueries).filter(q => q && q.length > 0);
    queriesToProcess = [...new Set(queriesToProcess)];
    if (queriesToProcess.length > WidgetConfig_bg.MAX_TOTAL_TMDB_QUERIES_TO_PROCESS) {
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索] 查询词过多 (${queriesToProcess.length}), 截断为 ${WidgetConfig_bg.MAX_TOTAL_TMDB_QUERIES_TO_PROCESS} 个`);
        queriesToProcess = queriesToProcess.slice(0, WidgetConfig_bg.MAX_TOTAL_TMDB_QUERIES_TO_PROCESS);
    }
    return queriesToProcess;
}

async function searchTmdb_bg(originalTitle, chineseTitle, listTitle, searchMediaType = CONSTANTS_bg.MEDIA_TYPES.TV, year = '', isLikelyMovieOrShort = false, isShortFilm = false, bgmItemDataForScoringOverride = null) {
    const cacheKeyComponents = { oT: originalTitle, cT: chineseTitle, lT: listTitle, media: searchMediaType, y: year, v: "1.8_prefilter_logic", lmos: isLikelyMovieOrShort, isf: isShortFilm }; 
    if (bgmItemDataForScoringOverride) {
        cacheKeyComponents.bRt = bgmItemDataForScoringOverride.bgm_rating_total;
        cacheKeyComponents.bSc = bgmItemDataForScoringOverride.bgm_summary_exists_in_chinese;
    }
    const cacheKeyParams = cacheKeyComponents;

    return CacheUtil_bg.cachedOrFetch(CONSTANTS_bg.CACHE_KEYS.TMDB_SEARCH, cacheKeyParams, async () => {
        let bestOverallMatch = null; let highestOverallScore = -Infinity;
        const validYear = year && /^\d{4}$/.test(year) ? parseInt(year, 10) : null;
        const searchIdentifierForLog = `(oT:${originalTitle?.substring(0,15)},cT:${chineseTitle?.substring(0,15)},lT:${listTitle?.substring(0,15)},y:${year},m:${searchMediaType})`;
        
        const stage1QuerySource = originalTitle || chineseTitle;
        if (validYear && stage1QuerySource) {
            const preciseQueryText = normalizeTmdbQuery_bg(stage1QuerySource);
            if (preciseQueryText) {
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} Query: "${preciseQueryText}", Year: ${validYear}`);
                try {
                    const params = { query: preciseQueryText, language: "zh-CN", include_adult: false }; 
                    if (searchMediaType === CONSTANTS_bg.MEDIA_TYPES.TV) {
                        params.first_air_date_year = validYear;
                    } else {
                        params.primary_release_year = validYear;
                    }
                    
                    const tmdbResponse = await fetchWithRetry_bg(`/search/${searchMediaType}`, { params }, 'get', true, WidgetConfig_bg.HTTP_MAIN_RETRIES);
                    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1RawRsp] ${searchIdentifierForLog} Query:"${preciseQueryText}", Raw TMDB Response: ${JSON.stringify(tmdbResponse)?.substring(0, 500)}`);
                    const results = tmdbResponse?.results || (Array.isArray(tmdbResponse) ? tmdbResponse : null);

                    if (results?.length > 0) {
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} Found ${results.length} results from TMDB for query "${preciseQueryText}" with year.`);
                        for (const result of results) {
                            if (result.adult === true) {
                                if (WidgetConfig_bg.DEBUG_LOGGING) {
                                    console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB过滤S1] 跳过成人结果 TMDB ID: ${result.id}, Title: "${result.title || result.name}"`);
                                }
                                continue;
                            }
                            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1ItemEval] ${searchIdentifierForLog} Evaluating TMDB ID: ${result.id}, Title: "${result.title || result.name}", Genres: ${JSON.stringify(result.genre_ids)}`);
                            
                            const tmdbVoteAverage_s1 = result.vote_average || 0;
                            const tmdbOverview_s1 = result.overview || "";
                            const isLowRating_s1 = tmdbVoteAverage_s1 < 3;
                            const hasChineseChars_s1 = /[\u4e00-\u9fa5]/.test(tmdbOverview_s1);
                            if (isLowRating_s1 && !hasChineseChars_s1) { 
                                if (WidgetConfig_bg.DEBUG_LOGGING) {
                                    console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB Pre-Filter S1] Excluding TMDB ID: ${result.id}, Title: "${result.title || result.name}" due to low rating (${tmdbVoteAverage_s1}) and lack of Chinese in overview.`);
                                }
                                continue; 
                            }
                            
                            if (searchMediaType === CONSTANTS_bg.MEDIA_TYPES.TV && !(result.genre_ids && result.genre_ids.includes(CONSTANTS_bg.TMDB_ANIMATION_GENRE_ID))) { 
                                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} 跳过非动画TV结果 "${result.name || result.title}" (ID: ${result.id})`); 
                                continue; 
                            }
                            
                            let score = scoreTmdbResult_bg(result, preciseQueryText, validYear, searchMediaType, originalTitle, chineseTitle, isLikelyMovieOrShort, isShortFilm);
                            if (result.release_date?.startsWith(String(validYear)) || result.first_air_date?.startsWith(String(validYear))) {
                                score += WidgetConfig_bg.TMDB_SEARCH_STAGE1_YEAR_STRICT_SCORE_BOOST;
                            }

                            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1ItemScore] ${searchIdentifierForLog} TMDB ID: ${result.id}, Title: "${result.title || result.name}", Score: ${score.toFixed(2)}`);
                            if (score > highestOverallScore) { 
                                highestOverallScore = score; 
                                bestOverallMatch = result; 
                            }
                        }
                        if (bestOverallMatch && WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} Stage 1 Best Match: ID ${bestOverallMatch.id}, Title:"${bestOverallMatch.title || bestOverallMatch.name}", Score: ${highestOverallScore.toFixed(2)}`);
                        if (highestOverallScore >= WidgetConfig_bg.TMDB_SEARCH_STAGE1_HIGH_CONFIDENCE_EXIT_SCORE) {
                            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} Stage 1 High Score Exit.`);
                            return bestOverallMatch;
                        }
                    } else {
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} No results from TMDB for query "${preciseQueryText}" with year.`);
                    }
                } catch (e) { 
                    if (WidgetConfig_bg.DEBUG_LOGGING) console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} API call error:`, e.message); 
                    if (String(e.message).includes("401") || String(e.message).includes("403")) throw e; 
                }
            }
        } else if (WidgetConfig_bg.DEBUG_LOGGING && !stage1QuerySource && validYear){
             console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S1] ${searchIdentifierForLog} Valid year but no query source, skipping Stage 1.`);
        }

        const queriesToProcess = generateTmdbSearchQueries_bg(originalTitle, chineseTitle, listTitle);
        if (queriesToProcess.length === 0) { 
            if (WidgetConfig_bg.DEBUG_LOGGING && !bestOverallMatch) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} No queries for Stage 2 and no Stage 1 match.`);
            if (bestOverallMatch && highestOverallScore >= WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE_THRESHOLD) {
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} No queries, returning acceptable Stage 1 match.`);
                return bestOverallMatch;
            }
            return null;
        }

        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} Queries (${queriesToProcess.length}): ${JSON.stringify(queriesToProcess).substring(0,150)}...`);
        
        const queryPromises = queriesToProcess.map(query => async () => {
            try {
                const params = { query: query, language: "zh-CN", include_adult: false }; 
                const tmdbSearchResponse = await fetchWithRetry_bg(`/search/${searchMediaType}`, { params }, 'get', true, WidgetConfig_bg.HTTP_MAIN_RETRIES);
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2RawRsp] ${searchIdentifierForLog} Query:"${query}", Raw TMDB Response: ${JSON.stringify(tmdbSearchResponse)?.substring(0, 500)}`);
                const searchResults = tmdbSearchResponse?.results || (Array.isArray(tmdbSearchResponse) ? tmdbSearchResponse : null);
                let currentBestForQuery = null; let highScoreForQuery = -Infinity;

                if (searchResults?.length > 0) {
                    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} Found ${searchResults.length} results from TMDB for query "${query}".`);
                    for (const result of searchResults) {
                        if (result.adult === true) {
                            if (WidgetConfig_bg.DEBUG_LOGGING) {
                                console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB过滤S2] 跳过成人结果 TMDB ID: ${result.id}, Title: "${result.title || result.name}"`);
                            }
                            continue;
                        }
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2ItemEval] ${searchIdentifierForLog} Query:"${query}", Evaluating TMDB ID: ${result.id}, Title: "${result.title || result.name}", Genres: ${JSON.stringify(result.genre_ids)}`);
                        
                        const tmdbVoteAverage_s2 = result.vote_average || 0;
                        const tmdbOverview_s2 = result.overview || "";
                        const isLowRating_s2 = tmdbVoteAverage_s2 < 3;
                        const hasChineseChars_s2 = /[\u4e00-\u9fa5]/.test(tmdbOverview_s2);
                        if (isLowRating_s2 && !hasChineseChars_s2) { 
                            if (WidgetConfig_bg.DEBUG_LOGGING) {
                                console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB Pre-Filter S2] Excluding TMDB ID: ${result.id}, Title: "${result.title || result.name}" for query "${query}" due to low rating (${tmdbVoteAverage_s2}) and lack of Chinese in overview.`);
                            }
                            continue; 
                        }
                        
                        if (searchMediaType === CONSTANTS_bg.MEDIA_TYPES.TV && !(result.genre_ids && result.genre_ids.includes(CONSTANTS_bg.TMDB_ANIMATION_GENRE_ID))) { 
                            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} Query:"${query}", 跳过非动画TV结果 "${result.name || result.title}" (ID: ${result.id})`); 
                            continue; 
                        }
                        const scoringDataS2 = bgmItemDataForScoringOverride || {
                            originalTitle_bgm: originalTitle, chineseTitle_bgm: chineseTitle, year_bgm: validYear,
                            searchMediaType_bgm: searchMediaType, isLikelyMovieOrShort_bgm: isLikelyMovieOrShort, isShortFilm_bgm: isShortFilm,
                            bgm_rating_total: 0, bgm_summary_exists_in_chinese: false, 
                            bgm_id_for_log: `S2_${query?.substring(0,10)}`
                        };
                        const score = scoreTmdbResult_bg(result, query, validYear, searchMediaType, originalTitle, chineseTitle, isLikelyMovieOrShort, isShortFilm, scoringDataS2);
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2ItemScore] ${searchIdentifierForLog} Query:"${query}", TMDB ID: ${result.id}, Title: "${result.title || result.name}", Score: ${score.toFixed(2)}`);
                        if (score > highScoreForQuery) { 
                            highScoreForQuery = score; 
                            currentBestForQuery = result; 
                        }
                    }
                } else {
                    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} No results from TMDB for query "${query}".`);
                }
                return { result: currentBestForQuery, score: highScoreForQuery, query };
            } catch (e) { 
                if (WidgetConfig_bg.DEBUG_LOGGING) console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} API call error for query "${query}":`, e.message); 
                if (String(e.message).includes("401")||String(e.message).includes("403")) throw e; 
                return { result: null, score: -Infinity, query }; 
            }
        });

        for (let i = 0; i < queryPromises.length; i += WidgetConfig_bg.MAX_CONCURRENT_TMDB_SEARCHES) {
            const batch = queryPromises.slice(i, i + WidgetConfig_bg.MAX_CONCURRENT_TMDB_SEARCHES).map(p => p());
            try {
                const settledResults = await Promise.allSettled(batch);
                for (const sr of settledResults) {
                    if (sr.status === 'fulfilled' && sr.value.result && sr.value.score > highestOverallScore) { 
                        highestOverallScore = sr.value.score; 
                        bestOverallMatch = sr.value.result; 
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} New Best Overall (from query "${sr.value.query.substring(0,30)}...") ID ${bestOverallMatch.id}, Score: ${highestOverallScore.toFixed(2)}`);
                    }
                    else if (sr.status === 'rejected') { 
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} A query promise was rejected:`, sr.reason?.message); 
                        if (String(sr.reason?.message).includes("401")||String(sr.reason?.message).includes("403")) return null;
                    }
                }
            } catch (batchError) { 
                if (WidgetConfig_bg.DEBUG_LOGGING) console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索S2] ${searchIdentifierForLog} Batch execution error:`, batchError.message); 
                if (String(batchError.message).includes("401")||String(batchError.message).includes("403")) return null; 
            }
        }

        if (bestOverallMatch && highestOverallScore >= WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE_THRESHOLD) {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索] ${searchIdentifierForLog} Final Match: ID ${bestOverallMatch.id}, Title:"${bestOverallMatch.title || bestOverallMatch.name}", Score: ${highestOverallScore.toFixed(2)}`);
            return bestOverallMatch;
        }
        if (WidgetConfig_bg.DEBUG_LOGGING) { 
            console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB搜索] ${searchIdentifierForLog} 未找到满意的TMDB匹配项. 最高得分:${highestOverallScore.toFixed(2)} (阈值:${WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE_THRESHOLD})`);
        }
        return null; 
    });
}

function parseBangumiListItems_bg(htmlContent) {
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM列表解析_V2_DEBUG] 传入HTML内容 (前500字符): ${typeof htmlContent === 'string' ? htmlContent.substring(0, 500) : 'HTML内容非字符串或为空'}`);
    const $ = Widget.html.load(htmlContent); 
    const pendingItems = [];
    const listItemsSelector = 'ul#browserItemList li.item';
    const $listItems = $(listItemsSelector);
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM列表解析_V2_DEBUG] 使用选择器 "${listItemsSelector}" 找到 ${$listItems.length} 个列表项元素。`);

    $listItems.each((index, element) => {
        const $item = $(element); let subjectId = $item.attr('id');
        if (subjectId && subjectId.startsWith('item_')) { subjectId = subjectId.substring(5); } else { 
            if(WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM列表解析_V2_DEBUG] 无法解析条目ID for item at index ${index}:`, $item.find('h3 a.l').text() || '未知条目'); 
            return; 
        }
        const titleElement = $item.find('div.inner > h3 > a.l'); 
        const title = titleElement.text().trim(); 
        const detailLink = titleElement.attr('href');
        if (!detailLink || !detailLink.trim()) { 
            if(WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM列表解析_V2_DEBUG] 条目 "${title}" (ID: ${subjectId}) 没有有效的详情链接，已跳过。`); 
            return; 
        }
        const fullDetailLink = `${WidgetConfig_bg.BGM_BASE_URL}${detailLink}`; 
        let listCoverUrl = $item.find('a.subjectCover img.cover').attr('src');
        if (listCoverUrl && listCoverUrl.startsWith('//')) { listCoverUrl = 'https:' + listCoverUrl; } else if (!listCoverUrl) { listCoverUrl = ''; }
        const rating = $item.find('div.inner > p.rateInfo > small.fade').text().trim(); 
        const infoTextFromList = $item.find('div.inner > p.info.tip').text().trim();
        
        if (WidgetConfig_bg.DEBUG_LOGGING) {
            console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM列表解析_V2_DEBUG] 解析到条目 ${index + 1}: ID=${subjectId}, Title='${title.substring(0,30)}', Link='${detailLink}', Cover='${listCoverUrl ? listCoverUrl.substring(0,50) + "..." : "N/A"}', Rating='${rating}', Info='${infoTextFromList.substring(0,50)}...'`);
        }
        pendingItems.push({ id: subjectId, titleFromList: title, detailLink: fullDetailLink, coverFromList: listCoverUrl, ratingFromList: rating || "0", infoTextFromList: infoTextFromList });
    });
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM列表解析_V2_DEBUG] 函数结束，解析到 ${pendingItems.length} 个潜在条目。`);
    return pendingItems;
}

function buildBaseItemStructure_bg(pendingItem, detailData) {
    const {oTitle, cTitle, bPoster, rDate, dMTWidget, fRating} = detailData;
    const displayTitle = cTitle || oTitle || pendingItem.titleFromList || pendingItem.name_cn || pendingItem.name;
    let initialPoster = bPoster || pendingItem.coverFromList;
    if (!initialPoster && pendingItem.images?.large) {
        initialPoster = pendingItem.images.large.startsWith("//") ? "https:" + pendingItem.images.large : pendingItem.images.large;
    }
    return {
        id:String(pendingItem.id),
        type:"link",
        title:displayTitle,
        posterPath: initialPoster,
        backdropPath:'',
        releaseDate:rDate || pendingItem.air_date || '',
        mediaType:dMTWidget,
        rating:fRating || pendingItem.ratingFromList || (pendingItem.rating?.score ? pendingItem.rating.score.toFixed(1) : "0"),
        description: buildDisplayDescription_bg(
            rDate || pendingItem.air_date || "",
            pendingItem.summary ? `[${pendingItem.weekday_cn || ''}] ${pendingItem.summary}`.trim() : (pendingItem.infoTextFromList || ""),
            fRating || pendingItem.ratingFromList || (pendingItem.rating?.score ? pendingItem.rating.score.toFixed(1) : "0")
        ),
        genreTitle:null,
        link:pendingItem.detailLink || pendingItem.url || `${WidgetConfig_bg.BGM_BASE_URL}/subject/${pendingItem.id}`,
        tmdb_id:null,
        tmdb_overview:"",
        tmdb_genres:null,
        tmdb_tagline:"",
        tmdb_status:"",
        tmdb_original_title:"",
        tmdb_preferred_title:"",
        tmdb_origin_countries: [],
        tmdb_vote_count: null,
        bgm_id: String(pendingItem.id),
        bgm_score: pendingItem.rating?.score || (parseFloat(pendingItem.ratingFromList) || 0),
        bgm_rating_total: pendingItem.rating?.total || 0,
        bgm_info_text: pendingItem.infoTextFromList || ""
    };
}

let tmdbFullDetailFetchQueue_bg = [];
let isTmdbFullDetailFetchRunning_bg = false;
async function processTmdbFullDetailQueue_bg() {
    if (isTmdbFullDetailFetchRunning_bg || tmdbFullDetailFetchQueue_bg.length === 0) return;
    isTmdbFullDetailFetchRunning_bg = true;
    const batchSize = WidgetConfig_bg.MAX_CONCURRENT_TMDB_FULL_DETAILS_FETCH;
    const currentBatch = tmdbFullDetailFetchQueue_bg.splice(0, batchSize);

    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB完整详情队列] 处理批次大小: ${currentBatch.length}`);
    const promises = currentBatch.map(async (task) => {
        const { itemRef, tmdbSearchType, tmdbId } = task;
        try {
            if (!WidgetConfig_bg.FETCH_FULL_TMDB_DETAILS) {
                if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB完整详情队列] 警告: TMDB ID ${tmdbId} 的任务在队列中，但 FETCH_FULL_TMDB_DETAILS 为 false，已跳过。`);
                return;
            }
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB完整详情队列] 正在获取/填充 TMDB ID ${tmdbId} 的详情 (类型: ${tmdbSearchType})`);
            
            const tmdbDetail = await CacheUtil_bg.cachedOrFetch(
                CONSTANTS_bg.CACHE_KEYS.TMDB_FULL_DETAIL,
                { type: tmdbSearchType, id: tmdbId },
                async () => {
                    const response = await fetchWithRetry_bg(
                        `/${tmdbSearchType}/${tmdbId}`,
                        { params: { language: "zh-CN", append_to_response: WidgetConfig_bg.TMDB_APPEND_TO_RESPONSE } },
                        'get', true, WidgetConfig_bg.HTTP_MAIN_RETRIES
                    );
                    return response?.data || response;
                },
                { ttl: WidgetConfig_bg.TTL_TMDB_FULL_DETAIL_MS }
            );
            if (tmdbDetail) {
                populateItemFromTmdbFullDetail_bg(itemRef, tmdbDetail);
            } else if (WidgetConfig_bg.DEBUG_LOGGING) {
                console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB完整详情队列] TMDB ID ${tmdbId} 从API/缓存未返回详情对象。`);
            }
        } catch (e) { if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB完整详情队列] 处理 TMDB ID ${tmdbId} 失败:`, e.message, e.stack?.substring(0,100)); }
    });
    await Promise.allSettled(promises);
    isTmdbFullDetailFetchRunning_bg = false;
    if (tmdbFullDetailFetchQueue_bg.length > 0) Promise.resolve().then(processTmdbFullDetailQueue_bg);
    else if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB完整详情队列] 处理完毕。`);
}

async function integrateTmdbDataToItem_bg(baseItem, tmdbResult, tmdbSearchType, bgmOriginalYear, isLikelyMovieOrShort, isShortFilm) {
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB集成] BGM "${(baseItem.title).substring(0,30)}..." (BGM ID: ${baseItem.bgm_id}, BGM Year: ${bgmOriginalYear || 'N/A'}, isShort: ${isShortFilm}) -> TMDB "${(tmdbResult.title||tmdbResult.name||'').substring(0,30)}..." (ID:${tmdbResult.id}, Year: ${(tmdbResult.release_date || tmdbResult.first_air_date)?.substring(0,4) || 'N/A'})`);
    
    const tmdbYearStr = (tmdbResult.release_date || tmdbResult.first_air_date || "").substring(0, 4);
    const tmdbYear = tmdbYearStr && /^\d{4}$/.test(tmdbYearStr) ? parseInt(tmdbYearStr, 10) : null;
    const bgmYear = bgmOriginalYear && /^\d{4}$/.test(String(bgmOriginalYear)) ? parseInt(String(bgmOriginalYear), 10) : null;

    if (isShortFilm) {
        let yearMismatchForShortFilm = false;
        if (bgmYear && tmdbYear) {
            if (Math.abs(bgmYear - tmdbYear) > 0) { 
                yearMismatchForShortFilm = true;
            }
        } else if (bgmYear || tmdbYear) { 
            yearMismatchForShortFilm = true;
        }

        if (yearMismatchForShortFilm) {
            if (WidgetConfig_bg.DEBUG_LOGGING) {
                console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB集成] 短片年份不匹配 (BGM: ${bgmYear}, TMDB: ${tmdbYear}). 仅记录 TMDB ID (${tmdbResult.id}) for BGM ID ${baseItem.bgm_id}. 保留BGM原始信息 (type: ${baseItem.type}, id: ${baseItem.id}).`);
            }
            baseItem.tmdb_id = String(tmdbResult.id); 
            if (WidgetConfig_bg.FETCH_FULL_TMDB_DETAILS) {
                if (!tmdbFullDetailFetchQueue_bg.some(task => task.tmdbId === tmdbResult.id && task.itemRef === baseItem)) {
                     tmdbFullDetailFetchQueue_bg.push({ itemRef: baseItem, tmdbSearchType, tmdbId: tmdbResult.id });
                    if (!isTmdbFullDetailFetchRunning_bg) Promise.resolve().then(processTmdbFullDetailQueue_bg);
                }
            }
            return; 
        }
    }
    
    if (WidgetConfig_bg.DEBUG_LOGGING && isShortFilm) {
        console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB集成] 短片年份匹配 (BGM: ${bgmYear}, TMDB: ${tmdbYear}) for BGM ID ${baseItem.bgm_id}. Proceeding with full TMDB integration.`);
    }
    
    const originalBgmRating = baseItem.rating;
    const originalBgmReleaseDate = baseItem.releaseDate;
    const originalBgmPoster = baseItem.posterPath;

    baseItem.id = String(tmdbResult.id);
    baseItem.type = "tmdb"; 
    baseItem.mediaType = tmdbSearchType;
    baseItem.tmdb_id = String(tmdbResult.id); 
    baseItem.title = (tmdbResult.title || tmdbResult.name || baseItem.title).trim();
    baseItem.posterPath = tmdbResult.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbResult.poster_path}` : originalBgmPoster;
    baseItem.backdropPath = tmdbResult.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbResult.backdrop_path}`: '';
    baseItem.releaseDate = parseDate_bg(tmdbResult.release_date || tmdbResult.first_air_date) || originalBgmReleaseDate;
    baseItem.rating = tmdbResult.vote_average ? tmdbResult.vote_average.toFixed(1) : originalBgmRating;
    baseItem.description = buildDisplayDescription_bg(
    baseItem.releaseDate,
    tmdbResult.overview || "",
    baseItem.rating
    );
    baseItem.genreTitle = null; 
    baseItem.link = null; 
    baseItem.tmdb_origin_countries = tmdbResult.origin_country || [];
    baseItem.tmdb_vote_count = tmdbResult.vote_count;

    if (WidgetConfig_bg.FETCH_FULL_TMDB_DETAILS) {
        if (!tmdbFullDetailFetchQueue_bg.some(task => task.tmdbId === tmdbResult.id && task.itemRef === baseItem)) {
             tmdbFullDetailFetchQueue_bg.push({ itemRef: baseItem, tmdbSearchType, tmdbId: tmdbResult.id });
            if (!isTmdbFullDetailFetchRunning_bg) Promise.resolve().then(processTmdbFullDetailQueue_bg);
        } else if (WidgetConfig_bg.DEBUG_LOGGING) {
            console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [TMDB集成] 条目 TMDB ID ${tmdbResult.id} (引用匹配) 已在完整详情队列中。`);
        }
    } else {
        const currentDescription = String(baseItem.description || "");
        const dayPrefixMatch = currentDescription.match(/^\[.*?\]\s*/); 
        const dayPrefix = dayPrefixMatch ? dayPrefixMatch[0] : "";
        const baseDesc = currentDescription.replace(/^\[.*?\]\s*/, ''); 
        baseItem.description = `${dayPrefix}${baseDesc || ""}`.trim();
    }
}

async function getBangumiDetailCover_bg(subjectId, subjectDetailUrl, bangumiAccessToken = null, bangumiCookie = null) { 
    const cacheKeyParams = { subjectId }; 
    return CacheUtil_bg.cachedOrFetch(CONSTANTS_bg.CACHE_KEYS.BGM_DETAIL_COVER, cacheKeyParams, async () => {
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情封面] 尝试获取 BGM ID ${subjectId} 的高清封面从 ${subjectDetailUrl}, HasToken: ${!!bangumiAccessToken}`); 
        try {
            const detailCoverFetchOptions = {
                headers: { 
                    "Referer": `${WidgetConfig_bg.BGM_BASE_URL}/`,
                    "Accept-Language": "zh-CN,zh;q=0.9" 
                },
                bangumiAccessToken: bangumiAccessToken, 
            };
            const detailHtmlResponse = await fetchWithRetry_bg(
                subjectDetailUrl,
                detailCoverFetchOptions,
                'get', false, WidgetConfig_bg.HTTP_RETRIES
            );
            if (!detailHtmlResponse?.data) return null;
            const $ = Widget.html.load(detailHtmlResponse.data);
            let bPoster = $('#bangumiInfo .infobox a.thickbox.cover[href*="/l/"]').attr('href') ||
                          $('#bangumiInfo .infobox a.thickbox.cover[href*="/g/"]').attr('href') ||
                          $('#bangumiInfo .infobox img.cover[src*="/l/"]').attr('src') ||
                          $('#bangumiInfo .infobox img.cover[src*="/g/"]').attr('src');
            if (!bPoster) {
                bPoster = $('#bangumiInfo .infobox a.thickbox.cover').attr('href') || $('#bangumiInfo .infobox img.cover').attr('src') || '';
            }
            if (bPoster.startsWith('//')) bPoster = 'https:' + bPoster;
            if (bPoster && bPoster.includes('lain.bgm.tv/pic/cover/')) {
                bPoster = bPoster.replace(/\/(m|c|g|s)\//, '/l/'); 
            }
            if (bPoster && !bPoster.startsWith('http') && bPoster.includes('lain.bgm.tv')) {
                bPoster = (bPoster.startsWith('/') ? 'https:' : 'https:') + bPoster;
            } else if (bPoster && !bPoster.startsWith('http')) {
                if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情封面] BGM ID ${subjectId} 的封面路径非预期相对路径: ${bPoster}`);
                return null;
            }
            return bPoster || null;
        } catch (e) { if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情封面] 获取 BGM ID ${subjectId} 封面失败: ${e.message}`); return null; }
    }, { ttl: WidgetConfig_bg.TTL_BGM_DETAIL_COVER_MS });
}

async function getBgmdMap_bg() {
    const logPrefix = `${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGMD MapUtil]`;
    return CacheUtil_bg.cachedOrFetch(
        CONSTANTS_bg.CACHE_KEYS.BGMD_INDEX_DATA,
        'bgmd_index_map_v1', 
        async () => {
            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${logPrefix} Fetching and processing bgmd index.json from ${WidgetConfig_bg.BGMD_INDEX_URL}`);
            try {
                const response = await fetchWithRetry_bg(WidgetConfig_bg.BGMD_INDEX_URL, {}, 'get', false, WidgetConfig_bg.HTTP_MAIN_RETRIES);
                if (!response || !response.data || !response.data.bangumis || !Array.isArray(response.data.bangumis)) {
                    console.error(`${logPrefix} Failed to fetch or parse bgmd index.json: Invalid data structure. Response:`, JSON.stringify(response?.data).substring(0, 500));
                    return new Map(); 
                }
                
                const bangumiArray = response.data.bangumis;
                const bgmdMap = new Map();
                
                for (const item of bangumiArray) {
                    if (item.id && item.tmdb && item.tmdb.id && item.tmdb.type) {
                        bgmdMap.set(String(item.id), {
                            tmdbId: String(item.tmdb.id),
                            tmdbType: String(item.tmdb.type).toLowerCase(), 
                            tmdbName: item.tmdb.name || "",
                            tmdbOriginalName: item.tmdb.original_name || ""
                        });
                    } else {
                        if (WidgetConfig_bg.DEBUG_LOGGING && item.id) {
                            console.warn(`${logPrefix} Skipping bgmd item (BGM ID: ${item.id}) due to missing TMDB ID or type. Data:`, item);
                        }
                    }
                }
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${logPrefix} Successfully processed ${bgmdMap.size} entries from bgmd index.json into map.`);
                return bgmdMap;
            } catch (error) {
                console.error(`${logPrefix} Error fetching or processing bgmd index.json:`, error.message, error.stack?.substring(0, 200));
                return new Map(); 
            }
        },
        { ttl: WidgetConfig_bg.TTL_BGMD_INDEX_MS }
    );
}

async function fetchItemDetails_bg(pendingItem, categoryHint, rankingContext = {}, bangumiAccessToken = null, bangumiCookie = null) { 
    const logPrefixDetails = `${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限]`;
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${logPrefixDetails} 处理 BGM ID: ${pendingItem.id} ("${pendingItem.titleFromList.substring(0,30)}...") 分类: ${categoryHint}, ContextYear: ${rankingContext?.year}, HasToken: ${!!bangumiAccessToken}`); 

    let oTitle = pendingItem.titleFromList; 
    let cTitleFromBgmDetail = null; 
    let jTitleFromBgmDetail = null; 
    let bPoster = pendingItem.coverFromList;
    let rDate = '';
    let fRating = pendingItem.ratingFromList || "0";
    let yearForTmdb = '';
    let dMTWidget = CONSTANTS_bg.MEDIA_TYPES.ANIME; 
    
    let tmdbSType = CONSTANTS_bg.MEDIA_TYPES.TV; 
    let isLikelyMovieOrShort = false;
    let isShortFilm = false;
    let determinedByInfoboxTV = false;
    let determinedByPageTagTV = false;

    let bgmTypeValueFromInfobox = ""; 

    if (pendingItem.infoTextFromList) {
        const yearMatchList = pendingItem.infoTextFromList.match(/(\d{4})(?:年)?/);
        if (yearMatchList && yearMatchList[1]) {
            yearForTmdb = yearMatchList[1];
        }
        const dateMatchInInfo = pendingItem.infoTextFromList.match(/(\d{4}年\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月|\d{4}年[春夏秋冬]|\d{4}年)/);
        if (dateMatchInInfo?.[0]) {
            const parsedDateFromList = parseDate_bg(dateMatchInInfo[0]);
            if (parsedDateFromList) rDate = parsedDateFromList;
        }
    }
    if (!rDate && yearForTmdb) rDate = `${yearForTmdb}-01-01`;

    try {
        if (pendingItem.detailLink) {
            const detailFetchOptions = { 
                headers: { 
                    "Referer": `${WidgetConfig_bg.BGM_BASE_URL}/`, 
                    "Accept-Language": "zh-CN,zh;q=0.9" 
                },
                bangumiAccessToken: bangumiAccessToken, 
            };
            const detailHtmlResponse = await fetchWithRetry_bg( pendingItem.detailLink, detailFetchOptions, 'get', false, WidgetConfig_bg.HTTP_RETRIES );
            if (detailHtmlResponse?.data) {
                const $ = Widget.html.load(detailHtmlResponse.data);
                cTitleFromBgmDetail = getInfoFromBox_bg($, "中文名:");
                if (cTitleFromBgmDetail && WidgetConfig_bg.DEBUG_LOGGING) {
                    console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] 从BGM详情页 (ID ${pendingItem.id}) 获取到中文名: "${cTitleFromBgmDetail}"`);
                }
                jTitleFromBgmDetail = getInfoFromBox_bg($, "日文名:") || getInfoFromBox_bg($, "日本語題:") || getInfoFromBox_bg($, "原作名:");
                if (jTitleFromBgmDetail && WidgetConfig_bg.DEBUG_LOGGING) {
                    console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] 从BGM详情页 (ID ${pendingItem.id}) 获取到日文名/原作名: "${jTitleFromBgmDetail}"`);
                }
                bgmTypeValueFromInfobox = getInfoFromBox_bg($, "类型:");
                if (WidgetConfig_bg.DEBUG_LOGGING) {
                    console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] BGM ID ${pendingItem.id} - Infobox 类型 (原始获取值): '${bgmTypeValueFromInfobox}'`);
                }

                const pageTags = [];
                $('div#subject_detail div.subject_tag_section a.l').each((i, elem) => {
                    pageTags.push($(elem).text().toLowerCase());
                });
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] BGM ID ${pendingItem.id} - 页面标签: ${JSON.stringify(pageTags)}`);

                const theatricalMovieKeywords = ["剧场版", "动画电影", "电影", "film"];
                const ovaOadKeywords = ["ova", "oad"];
                const webAnimeKeywords = ["web动画", "webアニメ"];
                const shortFilmKeywordsInTags = ["短片", "short film", "short"];

                const lowerInfoboxType = bgmTypeValueFromInfobox.toLowerCase();
                let isTheatricalMovie = theatricalMovieKeywords.some(keyword => lowerInfoboxType.includes(keyword) || pageTags.some(tag => tag.toLowerCase().includes(keyword)));
                let isOvaOrOad = ovaOadKeywords.some(keyword => lowerInfoboxType.includes(keyword) || pageTags.some(tag => tag.toLowerCase().includes(keyword)));
                let isWebAnime = webAnimeKeywords.some(keyword => lowerInfoboxType.includes(keyword) || pageTags.some(tag => tag.toLowerCase().includes(keyword)));
                let hasShortFilmTag = pageTags.some(tag => shortFilmKeywordsInTags.some(keyword => tag.toLowerCase().includes(keyword)));

                if (!determinedByInfoboxTV && !determinedByPageTagTV) { 
                    if (isTheatricalMovie) {
                        tmdbSType = CONSTANTS_bg.MEDIA_TYPES.MOVIE;
                        isLikelyMovieOrShort = true;
                        isShortFilm = false; 
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 明确为剧场版/电影 -> MOVIE.`);
                        if (hasShortFilmTag) { 
                            isShortFilm = true;
                            if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 剧场版/电影 同时标记为短片 -> isShortFilm=true.`);
                        }
                    } else if (isOvaOrOad) { 
                        tmdbSType = CONSTANTS_bg.MEDIA_TYPES.TV; 
                        isLikelyMovieOrShort = false;
                        isShortFilm = false;
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 明确为OVA/OAD (且非剧场版) -> TV.`);
                    } else if (isWebAnime) {
                        tmdbSType = CONSTANTS_bg.MEDIA_TYPES.MOVIE; 
                        isLikelyMovieOrShort = true;
                        isShortFilm = false; 
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 明确为WEB动画 -> MOVIE.`);
                        if (hasShortFilmTag) {
                           isShortFilm = true;
                           if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): WEB动画 同时标记为短片 -> isShortFilm=true.`);
                        }
                    } else if (hasShortFilmTag) { 
                        tmdbSType = CONSTANTS_bg.MEDIA_TYPES.MOVIE;
                        isLikelyMovieOrShort = true;
                        isShortFilm = true;
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 仅有短片标签 -> MOVIE, isShortFilm=true.`);
                    } else {
                        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 未匹配特定电影/OVA/WEB/短片类型，维持默认 tmdbSType=${tmdbSType} (通常是TV).`);
                    }
                } else {
                     if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB类型判断 (ID ${pendingItem.id}): 已通过Infobox/页面标签明确判断为TV (determinedByInfoboxTV=${determinedByInfoboxTV}, determinedByPageTagTV=${determinedByPageTagTV}).`);
                }

                let detailPagePoster = await getBangumiDetailCover_bg(String(pendingItem.id), pendingItem.detailLink, bangumiAccessToken, bangumiCookie); 
                if (detailPagePoster) bPoster = detailPagePoster;
                let rDateStrFromDetail = getInfoFromBox_bg($, "放送开始:") || getInfoFromBox_bg($, "上映年度:");
                if (rDateStrFromDetail) {
                    const parsedDetailDate = parseDate_bg(rDateStrFromDetail);
                    if (parsedDetailDate) rDate = parsedDetailDate;
                }
            }
        }
    } catch (htmlError) {
        console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] 获取/解析BGM详情页中文名/海报/日期失败 (ID ${pendingItem.id}):`, htmlError.message);
    }
    
    const item = buildBaseItemStructure_bg(pendingItem, { oTitle, cTitle: cTitleFromBgmDetail, bPoster, rDate, dMTWidget, fRating });
    
    if (WidgetConfig_bg.BGM_USE_BGMD_INDEX) {
        try {
            const bgmdMap = await getBgmdMap_bg();
            const bgmdEntry = bgmdMap.get(String(pendingItem.id));

            if (bgmdEntry && bgmdEntry.tmdbId && bgmdEntry.tmdbType) {
                if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${logPrefixDetails} Found mapping in BGMD for BGM ID ${pendingItem.id} -> TMDB ID ${bgmdEntry.tmdbId} (Type: ${bgmdEntry.tmdbType})`);
                
                const tmdbDetail = await CacheUtil_bg.cachedOrFetch(
                    CONSTANTS_bg.CACHE_KEYS.TMDB_FULL_DETAIL,
                    { type: bgmdEntry.tmdbType, id: bgmdEntry.tmdbId },
                    async () => {
                        const response = await fetchWithRetry_bg(
                            `/${bgmdEntry.tmdbType}/${bgmdEntry.tmdbId}`,
                            { params: { language: "zh-CN", append_to_response: WidgetConfig_bg.TMDB_APPEND_TO_RESPONSE } },
                            'get', true, WidgetConfig_bg.HTTP_MAIN_RETRIES
                        );
                        return response?.data || response;
                    },
                    { ttl: WidgetConfig_bg.TTL_TMDB_FULL_DETAIL_MS }
                );

                if (tmdbDetail && tmdbDetail.id) {
                    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${logPrefixDetails} Successfully fetched full TMDB details for mapped ID ${bgmdEntry.tmdbId}.`);
                    populateItemFromTmdbFullDetail_bg(item, tmdbDetail); 
                    item.id = String(tmdbDetail.id);
                    item.type = "tmdb";
                    item.mediaType = bgmdEntry.tmdbType; 
                    item.tmdb_id = String(tmdbDetail.id);
                    if (!item.title || item.title === (cTitleFromBgmDetail || oTitle) ) { 
                         item.title = item.tmdb_preferred_title || tmdbDetail.title || tmdbDetail.name || bgmdEntry.tmdbName || bgmdEntry.tmdbOriginalName || item.title;
                    }
                    item.posterPath = tmdbDetail.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbDetail.poster_path}` : item.posterPath;
                    item.backdropPath = tmdbDetail.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbDetail.backdrop_path}`: '';
                    item.link = null; 

                    if (WidgetConfig_bg.DEBUG_LOGGING) {
                        const logItemOutput = {...item};
                        if(logItemOutput.tmdb_overview?.length>30) logItemOutput.tmdb_overview = logItemOutput.tmdb_overview.substring(0,27)+"...";
                        if(logItemOutput.description?.length>30) logItemOutput.description = logItemOutput.description.substring(0,27)+"...";
                        console.log(`${logPrefixDetails} [BGMD Path] Processing complete for BGM ID ${pendingItem.id}. Final ID: ${logItemOutput.id}, Type: ${logItemOutput.type}, Title: "${logItemOutput.title.substring(0,30)}..."`);
                    }
                    return item; 
                } else {
                    if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${logPrefixDetails} Failed to fetch TMDB details for mapped ID ${bgmdEntry.tmdbId} (BGM ID ${pendingItem.id}). Falling back to search.`);
                }
            } else if (bgmdEntry) {
                 if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${logPrefixDetails} BGMD entry for BGM ID ${pendingItem.id} found but invalid (missing tmdbId or tmdbType). Falling back to search. Entry:`, bgmdEntry);
            }
        } catch (bgmdError) {
            console.error(`${logPrefixDetails} Error during BGMD index processing for BGM ID ${pendingItem.id}:`, bgmdError.message, bgmdError.stack?.substring(0,150));
        }
    }

    if ((!yearForTmdb || yearForTmdb === '') && item.releaseDate && typeof item.releaseDate === 'string' && item.releaseDate.length >= 4) {
        const yearFromItemReleaseDate = item.releaseDate.substring(0, 4);
        if (/^\d{4}$/.test(yearFromItemReleaseDate)) { 
            yearForTmdb = yearFromItemReleaseDate;
            if (WidgetConfig_bg.DEBUG_LOGGING) {
                console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] Fallback: 从 item.releaseDate ("${item.releaseDate}") 提取到年份: ${yearForTmdb} for BGM ID ${pendingItem.id}`);
            }
        }
    }
    
    const bgmSummaryForCheck = item.description || pendingItem.infoTextFromList || "";    const bgmHasChineseSummary = /[\u4e00-\u9fa5]/.test(bgmSummaryForCheck);
    const bgmRatingTotalFromBgm = pendingItem.rating?.total || item.bgm_rating_total || 0; 

    const bgmItemDataForScoring = {
        originalTitle_bgm: jTitleFromBgmDetail || oTitle,
        chineseTitle_bgm: cTitleFromBgmDetail || '',
        year_bgm: yearForTmdb,
        searchMediaType_bgm: tmdbSType,
        isLikelyMovieOrShort_bgm: isLikelyMovieOrShort,
        isShortFilm_bgm: isShortFilm,
        bgm_rating_total: bgmRatingTotalFromBgm, 
        bgm_summary_exists_in_chinese: bgmHasChineseSummary,
        bgm_id_for_log: String(pendingItem.id) 
    };
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] bgmItemDataForScoring for BGM ID ${pendingItem.id}: ${JSON.stringify(bgmItemDataForScoring).substring(0,300)}...`);

    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB搜索 for BGM ID ${pendingItem.id}: 原名="${jTitleFromBgmDetail || oTitle}", 中文名="${cTitleFromBgmDetail || ''}", 列表标题="${oTitle}", 最终年份="${yearForTmdb}", 类型="${tmdbSType}", isMovieOrShort=${isLikelyMovieOrShort}, isShort=${isShortFilm}`);
    
    const tmdbRes = await searchTmdb_bg(
        jTitleFromBgmDetail || oTitle, 
        cTitleFromBgmDetail, 
        oTitle, 
        tmdbSType, 
        yearForTmdb, 
        isLikelyMovieOrShort, 
        isShortFilm,
        bgmItemDataForScoring 
    );

    if (tmdbRes?.id) {
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB匹配成功 for BGM ID ${pendingItem.id}. TMDB ID: ${tmdbRes.id}`);
        await integrateTmdbDataToItem_bg(item, tmdbRes, tmdbSType, yearForTmdb, isLikelyMovieOrShort, isShortFilm);
    } else {
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] TMDB匹配失败 for BGM ID ${pendingItem.id}. 将使用 BGM 列表数据并尝试获取BGM详情页数据。`);
        try {
            const detailHtmlResponse = await fetchWithRetry_bg( pendingItem.detailLink, { headers: { "User-Agent": WidgetConfig_bg.BGM_API_USER_AGENT, "Referer": `${WidgetConfig_bg.BGM_BASE_URL}/`, "Accept-Language": "zh-CN,zh;q=0.9" } }, 'get', false, WidgetConfig_bg.HTTP_MAIN_RETRIES );
            if (!detailHtmlResponse?.data) throw new Error(`Bangumi详情页数据为空或无效: ${pendingItem.detailLink}`);
            
            const $ = Widget.html.load(detailHtmlResponse.data);
            item.title = ($('h1.nameSingle > a').first().text().trim()) || item.title;
            const cnTitleFromDetail = getInfoFromBox_bg($, "中文名:");
            if (cnTitleFromDetail) item.title = cnTitleFromDetail;

            let detailPagePoster = await getBangumiDetailCover_bg(String(pendingItem.id), pendingItem.detailLink, bangumiAccessToken, bangumiCookie); 
            if (detailPagePoster) item.posterPath = detailPagePoster;
            
            let rDateStrFromDetail = getInfoFromBox_bg($, "放送开始:") || getInfoFromBox_bg($, "上映年度:");
            item.releaseDate = parseDate_bg(rDateStrFromDetail) || item.releaseDate;
            item.rating = ($('#panelInterestWrapper .global_rating .number').text().trim()) || item.rating;
            const summaryFromDetail = getInfoFromBox_bg($, "简介");
            if (summaryFromDetail) {
    item.description = buildDisplayDescription_bg(
        item.releaseDate,
        summaryFromDetail,
        item.rating
    );
} else {
    item.description = buildDisplayDescription_bg(
        item.releaseDate,
        item.description,
        item.rating
    );
}

        } catch (htmlError) {
            console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] 获取/解析BGM HTML详情页失败 (ID ${pendingItem.id}):`, htmlError.message);
        }
    }

    if (WidgetConfig_bg.DEBUG_LOGGING) {
        const logItemOutput = {...item};
        if(logItemOutput.tmdb_overview?.length>30) logItemOutput.tmdb_overview = logItemOutput.tmdb_overview.substring(0,27)+"...";
        if(logItemOutput.description?.length>30) logItemOutput.description = logItemOutput.description.substring(0,27)+"...";
        console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM详情_极限] 处理完成: BGM_ID:${pendingItem.id}, 最终ID:${logItemOutput.id}, 类型:${logItemOutput.type}, 标题:"${logItemOutput.title.substring(0,30)}"...`);
    }
    return item;
}

async function processBangumiPage_bg(url, categoryHint, currentPageString, rankingContextInfo = {}, bangumiAccessToken = null, bangumiCookie = null) { 
    const currentPage = currentPageString ? parseInt(currentPageString, 10) : 0;
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理_V2_DEBUG] 列表页URL: ${url}, 当前页: ${currentPage > 0 ? currentPage : '未知/1'}, Context: ${JSON.stringify(rankingContextInfo)}, HasToken: ${!!bangumiAccessToken}`); 
    
    let listHtml;
    const commonHeaders = { 
        "Referer": `${WidgetConfig_bg.BGM_BASE_URL}/`, 
        "Accept-Language": "zh-CN,zh;q=0.9" 
    };
    const fetchOptions = { headers: commonHeaders, bangumiAccessToken: bangumiAccessToken, bangumiCookieString: bangumiCookie }; 

    const prefetchedHtmlPromise = PrefetchCache_bg.get(url); 
    if (prefetchedHtmlPromise) { 
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 使用预取缓存中的HTML Promise: ${url}`); 
        try { listHtml = await prefetchedHtmlPromise; } 
        catch (e) { 
            if (WidgetConfig_bg.DEBUG_LOGGING) console.warn(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 预取HTML的Promise解析失败 (${url}): ${e.message}。将尝试重新获取。`); 
            listHtml = null; 
        }
    }

    if (!listHtml) { 
        if (WidgetConfig_bg.DEBUG_LOGGING && !prefetchedHtmlPromise) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 未在预取缓存中找到或预取失败，正常获取HTML: ${url}`); 
        try { 
            const listHtmlResp = await fetchWithRetry_bg(url, fetchOptions, 'get', false, WidgetConfig_bg.HTTP_MAIN_RETRIES); 
            if (!listHtmlResp?.data) throw new Error("列表页响应数据为空或无效"); 
            listHtml = listHtmlResp.data; 
        } catch (e) { 
            console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 获取列表页 ${url} 失败:`, e.message); 
            throw new Error(`请求Bangumi列表页失败: ${e.message}`); 
        } 
    }
    if (currentPage >= 1) { 
        const numPagesToPrefetchAhead = 2; 
        for (let i = 1; i <= numPagesToPrefetchAhead; i++) {
            const pageNumToPrefetch = currentPage + i;
            let nextPageUrlToPrefetch;
            if (url.includes("page=")) {
                nextPageUrlToPrefetch = url.replace(/page=\d+/, `page=${pageNumToPrefetch}`);
            } else if (url.includes("?")) {
                nextPageUrlToPrefetch = `${url}&page=${pageNumToPrefetch}`;
            } else {
                nextPageUrlToPrefetch = `${url}?page=${pageNumToPrefetch}`;
            }

            if (nextPageUrlToPrefetch && nextPageUrlToPrefetch !== url) {
                if (WidgetConfig_bg.DEBUG_LOGGING) {
                    console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 触发预取 (第 ${i} 页往前): 页 ${pageNumToPrefetch}, URL: ${nextPageUrlToPrefetch}`);
                }
                PrefetchCache_bg.fetchAndCacheHtml(nextPageUrlToPrefetch, commonHeaders).catch(() => {
                });
            }
        }
    }
    const pendingItems = parseBangumiListItems_bg(listHtml);

    if (pendingItems.length === 0) { if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 从HTML未解析到任何条目。`); return []; }
    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 解析到 ${pendingItems.length} 个条目。开始并发获取详情 (最大并发: ${WidgetConfig_bg.MAX_CONCURRENT_DETAILS_FETCH})...`);
    const results = [];
    for (let i = 0; i < pendingItems.length; i += WidgetConfig_bg.MAX_CONCURRENT_DETAILS_FETCH) {
        const batch = pendingItems.slice(i, i + WidgetConfig_bg.MAX_CONCURRENT_DETAILS_FETCH);
        if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 处理详情批次 ${Math.floor(i/WidgetConfig_bg.MAX_CONCURRENT_DETAILS_FETCH)+1} (数量: ${batch.length})`);
        const detailPromises = batch.map(item => CacheUtil_bg.cachedOrFetch( 
            CONSTANTS_bg.CACHE_KEYS.ITEM_DETAIL_COMPUTED, 
            { itemId: item.id, category: categoryHint, scriptVer: CONSTANTS_bg.SCRIPT_VERSION, callingContextYear: rankingContextInfo?.year || 'all' }, 
            () => fetchItemDetails_bg(item, categoryHint, rankingContextInfo, bangumiAccessToken, null), 
            { calculateTTL: calculateContentTTL_bg, context: { currentDate: new Date() }, ttlIdentifier: rankingContextInfo } 
        ).catch(e => { console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 条目详情处理失败 (BGM ID: ${item.id}): `, e.message); return null; }) );
        const settledResults = await Promise.allSettled(detailPromises);
        settledResults.forEach(sr => { if (sr.status === 'fulfilled' && sr.value) { results.push(sr.value); } else if (sr.status === 'rejected') { console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 一个条目详情Promise被拒绝:`, sr.reason?.message); } });
    }

    if (WidgetConfig_bg.DEBUG_LOGGING) console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [BGM页面处理] 列表页处理完成。返回 ${results.length} 条有效结果.`);
    return results;
}


async function fetchBangumiTagPage_bg(params = {}) {
    const category = CONSTANTS_bg.MEDIA_TYPES.ANIME;
    const tagKeyword = params.tag_keyword || "";
    const sort = params.sort || "rank";
    const page = params.page || "1";

    const trimmedTag = tagKeyword.trim();
    let basePath = `${WidgetConfig_bg.BGM_BROWSE_URL || 'https://bangumi.tv'}/${category}/tag/`;

    if (trimmedTag) {
        basePath += `${encodeURIComponent(trimmedTag)}/`;
    }

    const url = `${basePath}?sort=${sort}&page=${page}`;

    if (WidgetConfig_bg.DEBUG_LOGGING) {
        console.log(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [模式] 获取 Bangumi 动画标签页: URL=${url}, Params=${JSON.stringify(params)}`);
    }

    try {
        const tagContextInfo = {
            category,
            tag: trimmedTag || "_all_tags_",
            sort
        };
        return await processBangumiPage_bg(url, category, page, tagContextInfo, null, null);
    } catch (error) {
        console.error(`${CONSTANTS_bg.LOG_PREFIX_GENERAL} [模式] fetchBangumiTagPage_bg(标签:'${tagKeyword}', 排序:${sort}, 页:${page}) 发生顶层错误:`, error.message, error.stack);
        return [];
    }
}

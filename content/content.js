// 安全获取属性值的函数
const safeGetAttribute = (element, attr) => {
  try {
    const value = element[attr];
    return typeof value === 'string' ? value : '';
  } catch (e) {
    return '';
  }
};

// 等待依赖加载 - 简化检查
const waitForDependencies = () => {
  const deps = [
    'SCANNER_CONFIG',
    'SCANNER_FILTER',
    'logger'
  ];
  return new Promise(resolve => {
    (function check() {
      deps.every(dep => window[dep]) ? resolve() : setTimeout(check, 50);
    })();
  });
};

// 存储扫描结果的集合
const latestResults = {
  domains: new Set(),     // 域名结果集
  apis: new Set(),        // API 结果集
  ips: new Set(),         // IP 地址结果集
  internalIps: new Set(), // 内网 IP 结果集
  phones: new Set(),      // 手机号结果集
  emails: new Set(),      // 邮箱结果集
  idcards: new Set(),     // 身份证号结果集
  urls: new Set(),        // URL 结果集
  jwts: new Set(),        // JWT Token 结果集
  awsKeys: new Set(),     // AWS Access Key 结果集
  hashes: {              // 哈希结果集
    md5: new Set(),
    sha1: new Set(),
    sha256: new Set()
  }
};

// 优化获取脚本内容函数
async function getAllScriptContents() {
  const sources = new Set();
  const jsContents = new Set();

  try {
    // 获取当前页面的基础URL
    const baseUrl = window.location.origin;
    
    // 1. 从 document.scripts 获取
    const scripts = Array.from(document.scripts)
      .filter(script => script?.src && typeof script.src === 'string' && script.src.trim());
    
    // 2. 从页面内容正则匹配获取
    const pageContent = document.documentElement.outerHTML;
    const jsPattern = /(?:src|href)=['"]([^'"]+\.(?:js)(?:\?[^\s'"]*)?)['"]/g;
    const jsMatches = Array.from(pageContent.matchAll(jsPattern))
      .map(match => {
        const path = match[1];
        try {
          // 处理不同类型的路径
          if (path.startsWith('http')) {
            return path;
          } else if (path.startsWith('//')) {
            return window.location.protocol + path;
          } else if (path.startsWith('/')) {
            return baseUrl + path;
          } else {
            return new URL(path, baseUrl).href;
          }
        } catch (e) {
          console.error('Error processing JS path:', e);
          return null;
        }
      })
      .filter(url => url !== null);

    // 合并所有JS文件URL并去重
    const allJsUrls = new Set([
      ...scripts.map(script => script.src),
      ...jsMatches
    ]);
    
    // 并行获取脚本内容
    const fetchPromises = Array.from(allJsUrls).map(async url => {
      if (jsContents.has(url)) return;
      jsContents.add(url);
      
      try {
        const response = await new Promise(resolve => {
          chrome.runtime.sendMessage({type: 'FETCH_JS', url: url}, resolve);
        });
        
        if (response?.content) {
          sources.add(response.content);
        }
      } catch (e) {
        console.error('Error fetching script:', url, e);
      }
    });

    await Promise.all(fetchPromises);
  } catch (e) {
    console.error('Error in getAllScriptContents:', e);
  }

  return sources;
}

// 优化资源收集函数
async function getAllSources() {
  const sources = new Set();
  
  try {
    // 1. 获取 HTML 内容
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      sources.add(htmlContent);
    }
    
    // 2. 获取脚本内容
    const scriptSources = await getAllScriptContents();
    if (scriptSources) {
      for (const source of scriptSources) {
        if (source) sources.add(source);
      }
    }

    // 3. 获取关键资源的 URL
    const criticalSelectors = [
      ['a[href^="http"]', 'href'],  // 只获取外部链接
      ['script[src]', 'src'],
      ['link[href]', 'href']
    ];

    for (const [selector, attr] of criticalSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const value = el[attr];
          if (value) sources.add(value);
        }
      } catch (e) {
        console.error('Error collecting resources:', e);
      }
    }

    // 4. 获取 meta 标签的内容
    try {
      const metas = document.querySelectorAll('meta[content]');
      for (const meta of metas) {
        const content = meta.content;
        if (content) sources.add(content);
      }
    } catch (e) {
      console.error('Error collecting meta content:', e);
    }

    // 5. 获取可能包含敏感信息的数据属性
    try {
      const sensitiveDataAttrs = ['api', 'url', 'endpoint', 'server', 'config'];
      for (const attr of sensitiveDataAttrs) {
        const elements = document.querySelectorAll(`[data-${attr}]`);
        for (const el of elements) {
          const value = el.dataset[attr];
          if (value) sources.add(value);
        }
      }
    } catch (e) {
      console.error('Error collecting data attributes:', e);
    }
  } catch (e) {
    console.error('Error in getAllSources:', e);
  }

  // 过滤结果
  return Array.from(sources).filter(source => 
    source && 
    typeof source === 'string' && 
    source.trim().length > 3 && 
    !source.startsWith('data:') && 
    !source.startsWith('blob:') &&
    !source.startsWith('javascript:')
  );
}

// 优化扫描函数
function scanSources(sources) {
  const seen = new Set();
  let lastUpdateTime = Date.now();
  const UPDATE_INTERVAL = 100; // 每100ms更新一次
  const MAX_CHUNK_SIZE = 500000; // 最大块大小：500KB
  
  // 发送更新的函数
  const sendUpdate = () => {
    const results = {};
    // 处理普通结果
    for (const key in latestResults) {
      if (key !== 'hashes') {
        results[key] = Array.from(latestResults[key]);
      }
    }
    // 单独处理哈希结果
    results.hashes = {};
    for (const hashType in latestResults.hashes) {
      results.hashes[hashType] = Array.from(latestResults.hashes[hashType]);
    }
    
    chrome.runtime.sendMessage({
      type: 'SCAN_UPDATE',
      results: results
    });
  };

  // 分块处理大文本
  function* splitIntoChunks(text) {
    const length = text.length;
    for (let i = 0; i < length; i += MAX_CHUNK_SIZE) {
      yield text.slice(i, i + MAX_CHUNK_SIZE);
    }
  }

  // 使用迭代器获取所有匹配
  function* getAllMatches(text, pattern) {
    if (!text || typeof text !== 'string') return;
    
    let match;
    try {
      while ((match = pattern.exec(text)) !== null) {
        yield match[0];
      }
    } catch (e) {
      console.error('Error in pattern matching:', e);
    }
  }
  
  for (const source of sources) {
    if (!source || seen.has(source)) continue;
    seen.add(source);
    let hasNewResults = false;

    // 对大文本进行分块处理
    for (const chunk of splitIntoChunks(source)) {
      // 处理哈希模式
      for (const [hashType, hashPattern] of Object.entries(SCANNER_CONFIG.PATTERNS.HASH)) {
        try {
          // 确保正则表达式有全局标志
          const pattern = new RegExp(hashPattern.source, hashPattern.flags.includes('g') ? hashPattern.flags : hashPattern.flags + 'g');
          for (const match of getAllMatches(chunk, pattern)) {
            if (SCANNER_FILTER.hash[hashType.toLowerCase()](match, latestResults)) {
              hasNewResults = true;
            }
          }
        } catch (e) {
          console.error('Error processing hash pattern:', hashType, e);
        }
      }

      // 处理其他模式
      for (const [key, pattern] of Object.entries(SCANNER_CONFIG.PATTERNS)) {
        if (key === 'HASH') continue;
        
        try {
          // 确保正则表达式有全局标志
          const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
          const filter = SCANNER_FILTER[key.toLowerCase()];
          
          if (filter) {
            for (const match of getAllMatches(chunk, regex)) {
              if (filter(match, latestResults)) {
                hasNewResults = true;
              }
            }
          }
        } catch (e) {
          console.error('Error processing pattern:', key, e);
        }
      }
    }

    // 如果有新结果且距离上次更新超过100ms，就发送更新
    if (hasNewResults && Date.now() - lastUpdateTime >= UPDATE_INTERVAL) {
      sendUpdate();
      lastUpdateTime = Date.now();
    }
  }

  // 最后再发送一次更新，确保所有结果都已发送
  sendUpdate();
}

// 初始化扫描
async function initScan() {
  try {
    await waitForDependencies();
    window.logger.info('开始扫描...');
    
    // 清空之前的结果
    Object.keys(latestResults).forEach(key => {
      if (key === 'hashes') {
        Object.keys(latestResults.hashes).forEach(hashType => {
          latestResults.hashes[hashType].clear();
        });
      } else {
        latestResults[key].clear();
      }
    });

    // 立即开始扫描HTML内容
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      scanSources([htmlContent]);
    }

    // 收集并扫描其他资源
    collectAndScanResources();
  } catch (error) {
    console.error('扫描失败:', error);
  }
}

// 增量收集和扫描资源
async function collectAndScanResources() {
  try {
    // 1. 收集并扫描关键资源的URL
    const criticalSelectors = [
      ['a[href^="http"]', 'href'],
      ['script[src]', 'src'],
      ['link[href]', 'href']
    ];

    for (const [selector, attr] of criticalSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        const urls = [];
        for (const el of elements) {
          const value = el[attr];
          if (value) urls.push(value);
        }
        if (urls.length > 0) {
          scanSources(urls);
        }
      } catch (e) {
        console.error('Error collecting resources:', e);
      }
    }

    // 2. 收集并扫描meta标签内容
    try {
      const metas = document.querySelectorAll('meta[content]');
      const contents = [];
      for (const meta of metas) {
        const content = meta.content;
        if (content) contents.push(content);
      }
      if (contents.length > 0) {
        scanSources(contents);
      }
    } catch (e) {
      console.error('Error collecting meta content:', e);
    }

    // 3. 收集并扫描数据属性
    try {
      const sensitiveDataAttrs = ['api', 'url', 'endpoint', 'server', 'config'];
      for (const attr of sensitiveDataAttrs) {
        const elements = document.querySelectorAll(`[data-${attr}]`);
        const values = [];
        for (const el of elements) {
          const value = el.dataset[attr];
          if (value) values.push(value);
        }
        if (values.length > 0) {
          scanSources(values);
        }
      }
    } catch (e) {
      console.error('Error collecting data attributes:', e);
    }

    // 4. 异步获取并扫描脚本内容
    const baseUrl = window.location.origin;
    
    // 从document.scripts获取
    const scripts = Array.from(document.scripts)
      .filter(script => script?.src && typeof script.src === 'string' && script.src.trim());
    
    // 从页面内容匹配获取
    const pageContent = document.documentElement.outerHTML;
    const jsPattern = /(?:src|href)=['"]([^'"]+\.(?:js)(?:\?[^\s'"]*)?)['"]/g;
    const jsMatches = Array.from(pageContent.matchAll(jsPattern))
      .map(match => {
        const path = match[1];
        try {
          if (path.startsWith('http')) {
            return path;
          } else if (path.startsWith('//')) {
            return window.location.protocol + path;
          } else if (path.startsWith('/')) {
            return baseUrl + path;
          } else {
            return new URL(path, baseUrl).href;
          }
        } catch (e) {
          console.error('Error processing JS path:', e);
          return null;
        }
      })
      .filter(url => url !== null);

    // 合并所有JS文件URL并去重
    const allJsUrls = new Set([
      ...scripts.map(script => script.src),
      ...jsMatches
    ]);

    // 并行获取脚本内容，但每个脚本获取后立即扫描
    const jsContents = new Set();
    const fetchPromises = Array.from(allJsUrls).map(async url => {
      if (jsContents.has(url)) return;
      jsContents.add(url);
      
      try {
        const response = await new Promise(resolve => {
          chrome.runtime.sendMessage({type: 'FETCH_JS', url: url}, resolve);
        });
        
        if (response?.content) {
          // 立即扫描获取到的脚本内容
          scanSources([response.content]);
        }
      } catch (e) {
        console.error('Error fetching script:', url, e);
      }
    });

    // 等待所有脚本获取完成
    await Promise.all(fetchPromises);
  } catch (e) {
    console.error('Error in collectAndScanResources:', e);
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_RESULTS') {
    // 返回当前的扫描结果
    sendResponse(Object.fromEntries(
      Object.entries(latestResults).map(([key, value]) => [key, Array.from(value)])
    ));
  } else if (request.type === 'REFRESH_SCAN') {
    // 重新执行扫描
    initScan().then(() => {
      sendResponse(Object.fromEntries(
        Object.entries(latestResults).map(([key, value]) => [key, Array.from(value)])
      ));
    });
    return true; // 保持消息通道打开
  } else if (request.type === 'GET_CONFIG') {
    // 返回配置信息，将正则表达式转换为字符串
    const config = {
      API: {
        PATTERN: SCANNER_CONFIG.API.PATTERN.toString()
      },
      PATTERNS: {
        DOMAIN: SCANNER_CONFIG.PATTERNS.DOMAIN.toString(),
        IP: SCANNER_CONFIG.PATTERNS.IP.toString(),
        PHONE: SCANNER_CONFIG.PATTERNS.PHONE.toString(),
        EMAIL: SCANNER_CONFIG.PATTERNS.EMAIL.toString(),
        IDCARD: SCANNER_CONFIG.PATTERNS.IDCARD.toString(),
        URL: SCANNER_CONFIG.PATTERNS.URL.toString(),
        JWT: SCANNER_CONFIG.PATTERNS.JWT.toString(),
        AWS_KEY: SCANNER_CONFIG.PATTERNS.AWS_KEY.toString(),
        HASH: {
          MD5: SCANNER_CONFIG.PATTERNS.HASH.MD5.toString(),
          SHA1: SCANNER_CONFIG.PATTERNS.HASH.SHA1.toString(),
          SHA256: SCANNER_CONFIG.PATTERNS.HASH.SHA256.toString()
        }
      }
    };
    sendResponse({ config });
  }
});

// 在页面加载完成后开始扫描
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScan);
} else {
  initScan();
} 
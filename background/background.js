// 更新扩展图标的badge
function updateBadge(results) {
  const categories = [
    results.domains,
    results.absoluteApis,
    results.apis,
    results.moduleFiles,
    results.docFiles,
    results.ips,
    results.phones,
    results.emails,
    results.idcards,
    results.jwts,
    results.imageFiles,
    results.jsFiles,
    results.vueFiles,
    results.urls,
    results.githubUrls,
    results.companies,
    results.credentials,
    results.cookies,
    results.idKeys,
  ];

  const nonEmptyCategories = categories.filter(category => 
    Array.isArray(category) && category.length > 0
  ).length;

  // 更新badge
  chrome.action.setBadgeText({ 
    text: nonEmptyCategories > 0 ? nonEmptyCategories.toString() : ''
  });

  // 根据是否有内容设置不同的颜色
  chrome.action.setBadgeBackgroundColor({ 
    color: nonEmptyCategories > 0 ? '#4dabf7' : '#666666'
  });
}

// 存储服务器指纹信息
let serverFingerprints = new Map();

const analyticsDetected = {
  baidu: new Map(),    
  yahoo: new Map(),    
  google: new Map(),   
};



// 统计服务配置
const ANALYTICS_CONFIG = {
  baidu: {
    pattern: '*://hm.baidu.com/hm.js*',
    name: '百度统计',
    description: '通过网络请求识别到百度统计服务，网站的用户访问数据会被百度记录',
    version: 'Baidu Analytics'
  },
  yahoo: {
    pattern: '*://analytics.yahoo.com/*',
    name: '雅虎统计',
    description: '通过网络请求识别到雅虎统计服务，网站的用户访问数据会被雅虎记录',
    version: 'Yahoo Analytics'
  },
  google: {
    pattern: '*://www.google-analytics.com/*',
    name: '谷歌统计',
    description: '通过网络请求识别到谷歌统计服务，网站的用户访问数据会被谷歌记录',
    version: 'Google Analytics'
  }
};

// 统一的统计服务检测处理函数
function handleAnalyticsDetection(details, type) {
  let fingerprints = serverFingerprints.get(details.tabId);
  if (!fingerprints) {
    fingerprints = {
      server: null,
      serverComponents: null,
      headers: new Map(),
      technology: null,
      security: null,
      analytics: null,
      builder: null
    };
    serverFingerprints.set(details.tabId, fingerprints);
  }

  // 更新或设置 analytics 信息
  if (!analyticsDetected[type].get(details.tabId)) {
    analyticsDetected[type].set(details.tabId, true);
    fingerprints.analytics = {
      name: ANALYTICS_CONFIG[type].name,
      description: ANALYTICS_CONFIG[type].description,
      version: ANALYTICS_CONFIG[type].version
    };

    // 更新存储
    serverFingerprints.set(details.tabId, fingerprints);

    // 通知更新
    try {
      chrome.tabs.sendMessage(details.tabId, {
        type: 'UPDATE_FINGERPRINTS',
        fingerprints: {
          server: fingerprints.server,
          serverComponents: fingerprints.serverComponents,
          headers: Object.fromEntries(fingerprints.headers),
          technology: fingerprints.technology,
          security: fingerprints.security,
          analytics: fingerprints.analytics,
          builder: fingerprints.builder
        }
      }).catch(() => {});
    } catch (e) {}
  }
}

// 为每个统计服务添加监听器
Object.entries(ANALYTICS_CONFIG).forEach(([type, config]) => {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => handleAnalyticsDetection(details, type),
    { urls: [config.pattern] },
    []
  );
});

// 在标签页关闭时清理检测状态
chrome.tabs.onRemoved.addListener((tabId) => {
  Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  serverFingerprints.delete(tabId);
});

// 在标签页更新时重置检测状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  }
});

// 处理server头
function parseServerHeader(serverHeader) {
  const components = {
    webServer: null,    

    os: null,          
    extensions: [],    
    modules: []        
  };
  const parts = serverHeader.split(' ').filter(part => part.length > 0);
  parts.forEach(part => {
    if (part.startsWith('(') && part.endsWith(')')) {
      const osInfo = part.slice(1, -1);
      if (osInfo.toLowerCase().includes('win')) {
        components.os = {
          name: 'Windows',
          version: osInfo
        };
      } else if (osInfo.toLowerCase().includes('linux')) {
        components.os = {
          name: 'Linux',
          version: osInfo
        };
      }else if (osInfo.toLowerCase().includes('ubuntu')) {
        components.os = {
          name: 'Ubuntu',
          version: osInfo
        };

      }
      return;
    }

    const serverName = part.split('/')[0].toLowerCase();
    if (/apache|nginx|iis|litespeed|resin|cloudflare/i.test(serverName)) {
      if(serverName.includes('cloudflare')){
        components.webServer = {
          name: 'Cloudflare',
          subType: 'Proxy',
          version: null
        };
        return;
      }
      // 处理 Apache 的特殊变体
      if (serverName.includes('apache')) {
        if (serverName.includes('coyote')) {
          components.webServer = {
            name: 'Apache',
            subType: 'Tomcat',
            version: null,
            component: {
              name: 'Coyote',
              version: part.includes('/') ? part.split('/')[1] : null
            }
          };
        } else if (serverName.includes('jserv')) {
          components.webServer = {
            name: 'Apache',
            subType: 'JServ',
            version: null,
            component: {
              name: 'JServ',
              version: part.includes('/') ? part.split('/')[1] : null
            }
          };
        } else {
          components.webServer = {
            name: 'Apache',
            version: part.includes('/') ? part.split('/')[1] : null
          };
        }
      } else {
        const name = serverName.charAt(0).toUpperCase() + serverName.slice(1);
        components.webServer = {
          name: name,
          version: part.includes('/') ? part.split('/')[1] : null
        };
        
        if (serverName.includes('microsoft-iis') && !components.os) {
          components.os = {
            name: 'Windows',
            version: 'windows'
          };
        }
      }
    }
    // 处理其他组件
    else if (part.includes('/')) {
      const [name, version] = part.split('/');
      if (name === 'OpenSSL') {
        components.extensions.push({
          name: 'OpenSSL',
          version: version,
          type: 'ssl'
        });
      }
      else if (name.startsWith('mod_')) {
        components.modules.push({
          name: name.replace('mod_', ''),
          version: version
        });
      }
      else {
        components.extensions.push({
          name: name,
          version: version,
          type: 'other'
        });
      }
    }else{
      components.webServer = {
        name: part,
        version: null
      };
    }
  });

  return components;
}

// webpack 检测
function detectWebpack(pageContent) {
  if (/(?:chunk|main|app|vendor|common)s?(?:[-.][a-f0-9]{8,20})+.(?:css|js)/.test(pageContent)) {
    return {
      name: 'Webpack',
      description: '通过文件命名特征识别到Webpack构建工具，用于前端资源打包',
      version: 'Webpack'
    };
  }

  return null;
}

// 监听网络请求
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === 'main_frame') {
      const headers = details.responseHeaders;
      if (headers) {
        const fingerprints = {
          server: null,
          serverComponents: null,  
          headers: new Map(),
          technology: null,
          security: null,  
          analytics: null,  
          builder: null    
        };

        headers.forEach(header => {
          const name = header.name.toLowerCase();
          
          if (name === 'server') {
            fingerprints.server = header.value;
            fingerprints.serverComponents = parseServerHeader(header.value);
          }
          else if (name === 'strict-transport-security') {
            const maxAge = header.value.match(/max-age=(\d+)/)?.[1] || 'unknown';
            fingerprints.security = {
              name: 'HSTS',
              description: `通过Strict-Transport-Security响应头识别，网站启用了HSTS安全策略，max-age=${maxAge}秒`,
              version: maxAge, 
              provider: 'Strict-Transport-Security'  // 添加 provider 字段以符合显示逻辑
            };
          }
          else if (name === 'x-powered-by') {
            const tech = identifyTechnologyFromHeader(header.value);
            if (tech) {
              if (tech.isSecurityComponent) {
                fingerprints.security = {
                  name: tech.name,
                  description: tech.description,
                  version: tech.version,
                  provider: 'X-Powered-By'
                };
              } else {
                fingerprints.technology = tech;
              }
            }
            fingerprints.headers.set(name, header.value);
          }
          else if (name === 'x-aspnetmvc-version') {
            const mvcVersion = header.value;
            fingerprints.headers.set(name, header.value); 
            if (!fingerprints.technology) {
              fingerprints.technology = {
                name: 'ASP.NET MVC',
                description: `通过X-AspNetMvc-Version响应头识别，网站使用ASP.NET MVC框架，版本号为${mvcVersion}`,
                framework: 'MVC',
                version: mvcVersion
              };
            } else if (fingerprints.technology.name === 'ASP.NET') {
              fingerprints.technology.name = 'ASP.NET MVC';
              fingerprints.technology.framework = 'MVC';
              fingerprints.technology.version = mvcVersion;
              fingerprints.technology.description = 
                `通过响应头识别，网站使用ASP.NET MVC框架，版本号为${mvcVersion}，运行在.NET Framework ${fingerprints.technology.runtime || '未知版本'}`;
            }
          }
          else if (name === 'x-aspnet-version') {
            const runtimeVersion = header.value;
            fingerprints.headers.set(name, header.value);
            if (!fingerprints.technology) {
              fingerprints.technology = {
                name: 'ASP.NET',
                description: `通过X-AspNet-Version响应头识别，网站运行在.NET Framework ${runtimeVersion}环境`,
                runtime: runtimeVersion
              };
            } else if (fingerprints.technology.name.includes('ASP.NET')) {
              fingerprints.technology.runtime = runtimeVersion;
              fingerprints.technology.description = 
                `通过响应头识别，网站使用${fingerprints.technology.name}${fingerprints.technology.framework ? ' ' + fingerprints.technology.framework : ''}框架，` +
                `版本号为${fingerprints.technology.version || '未知'}，运行在.NET Framework ${runtimeVersion}`;
            }
          }
          else if (name === 'set-cookie') {
            const tech = identifyTechnologyFromCookie(header.value);
            if (tech) {
              fingerprints.technology = tech;
            }
          }
          else if (name === 'x-safe-firewall') {
            fingerprints.security = parseSecurityHeader(header.value);
          }
          else if (name === 'x-xss-protection') {
            const mode = header.value.includes('mode=block') ? '，启用了阻止模式' : '';
            const enabled = header.value.startsWith('1') ? '启用' : '禁用';
            
            fingerprints.security = {
              name: 'XSS Protection',
              description: `通过X-XSS-Protection响应头识别，网站${enabled}了XSS防护${mode}`,
              version: enabled === '启用' ? '1' : '0',
              provider: 'X-XSS-Protection'
            };
          }
        });
        chrome.cookies.getAll({url: details.url}, (cookies) => {
          if (cookies && cookies.length > 0) {
            console.log(cookies);
            const cookieNames = cookies.map(cookie => cookie.name).join(';');
            const tech = identifyTechnologyFromCookie(cookieNames);
            if (tech) {
              fingerprints.technology = tech;
              serverFingerprints.set(details.tabId, fingerprints);
              try {
                chrome.tabs.sendMessage(details.tabId, {
                  type: 'UPDATE_FINGERPRINTS',
                  fingerprints: {
                    server: fingerprints.server,
                    serverComponents: fingerprints.serverComponents,
                    headers: Object.fromEntries(fingerprints.headers),
                    technology: fingerprints.technology,
                    security: fingerprints.security,
                    analytics: fingerprints.analytics,
                    builder: fingerprints.builder 
                  }
                }).catch(() => {});
              } catch (e) {}
            }
          }
        });

        // 在处理完响应头后,尝试检测 webpack
        fetch(details.url)
          .then(response => response.text())
          .then(body => {
            const webpackTech = detectWebpack(body);
            if (webpackTech && !fingerprints.builder) {
              fingerprints.builder = webpackTech;
              serverFingerprints.set(details.tabId, fingerprints);
              try {
                chrome.tabs.sendMessage(details.tabId, {
                  type: 'UPDATE_FINGERPRINTS',
                  fingerprints: {
                    server: fingerprints.server,
                    serverComponents: fingerprints.serverComponents,
                    headers: Object.fromEntries(fingerprints.headers),
                    technology: fingerprints.technology,
                    security: fingerprints.security,
                    analytics: fingerprints.analytics,
                    builder: fingerprints.builder 
                  }
                }).catch(() => {});
              } catch (e) {}
            }
          })
          .catch(() => {/* 忽略错误 */});

        // 存储该标签页的指纹信息
        serverFingerprints.set(details.tabId, fingerprints);

        // 延迟发送消息，等待内容脚本加载
        setTimeout(() => {
          try {
            chrome.tabs.sendMessage(details.tabId, {
              type: 'UPDATE_FINGERPRINTS',
              fingerprints: {
                server: fingerprints.server,
                serverComponents: fingerprints.serverComponents,
                headers: Object.fromEntries(fingerprints.headers),
                technology: fingerprints.technology,
                security: fingerprints.security,
                analytics: fingerprints.analytics,
                builder: fingerprints.builder
              }
            }).catch(() => {
            });
          } catch (e) {
          }
        }, 500);
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 添加构建工具更新消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_BUILDER') {
    const fingerprints = serverFingerprints.get(sender.tab.id);
    if (fingerprints && fingerprints.builder && fingerprints.builder.name!=request.builder.name) {
      fingerprints.builder = request.builder;
      serverFingerprints.set(sender.tab.id, fingerprints);
      try {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'UPDATE_FINGERPRINTS',
          fingerprints: {
            server: fingerprints.server,
            serverComponents: fingerprints.serverComponents,
            headers: Object.fromEntries(fingerprints.headers),
            technology: fingerprints.technology,
            security: fingerprints.security,
            analytics: fingerprints.analytics,
            builder: fingerprints.builder
          }
        }).catch(() => {});
      } catch (e) {}
    }
    return true;
  }
  if (request.type === 'GET_FINGERPRINTS') {
    // 获取当前标签页的指纹信息
    const fingerprints = serverFingerprints.get(request.tabId);
    if (fingerprints) {
      sendResponse({
        server: fingerprints.server,
        serverComponents: fingerprints.serverComponents,
        headers: Object.fromEntries(fingerprints.headers),
        technology: fingerprints.technology,
        security: fingerprints.security,
        analytics: fingerprints.analytics,
        builder: fingerprints.builder    
      });
    } else {
      sendResponse(null);
    }
    return true;
  }
  if (request.type === 'FETCH_JS') {
    fetch(request.url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      credentials: 'omit'  // 不发送 cookies
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(content => {
      sendResponse({ content });
    })
    .catch(error => {
      // 如果 fetch 失败，尝试使用 chrome.scripting.executeScript
      if (sender.tab) {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          function: (url) => {
            return fetch(url, {
              credentials: 'omit'
            }).then(r => r.text());
          },
          args: [request.url]
        })
        .then(results => {
          if (results[0]?.result) {
            sendResponse({ content: results[0].result });
          } else {
            sendResponse({ content: null });
          }
        })
        .catch(() => {
          sendResponse({ content: null });
        });
      } else {
        sendResponse({ content: null });
      }
    });
    return true; 
  } else if (request.type === 'UPDATE_BADGE') {
    updateBadge(request.results);
  }
});

// 识别Cookie
function identifyTechnologyFromCookie(cookieHeader) {
  const patterns = {
    'PHP': {
      pattern: /PHPSESSID/i,
      description: '通过Cookie识别，网站使用PHP作为服务端语言',
      version: 'PHP'
    },
    'ASP.NET': {
      pattern: /ASP\.NET_SessionId|ASPSESSIONID/i,
      description: '通过Cookie识别，网站使用ASP.NET作为服务端语言',
      version: 'ASP.NET'
    },
    'Java': {
      pattern: /JSESSIONID|SESSIONID|jeesite/i,
      description: '通过Cookie识别，网站使用Java作为服务端语言',
      version: 'Java'
    },

    'Django': {
      pattern: /sessionid.*django/i,
      description: '通过Cookie识别，网站使用Django(Python)作为服务端框架',
      version: 'Django'
    },
    'Rails': {
      pattern: /_session_id=.*rack/i,
      description: '通过Cookie识别，网站使用Ruby on Rails作为服务端框架',
      version: 'Rails'
    },

    'Laravel': {
      pattern: /laravel_session/i,
      description: '通过Cookie识别，网站使用Laravel(PHP)作为服务端框架',
      version: 'Laravel'
    }
  };
  for (const [tech, {pattern, description, version}] of Object.entries(patterns)) {
    if (pattern.test(cookieHeader)) {
      return {name: tech, description, version};
    }
  }


  return null;
}

// 从响应头识别技术栈
function identifyTechnologyFromHeader(headerValue) {
  const patterns = {
    'PHP': {
      pattern: /PHP/i,
      getVersion: (value) => value.split('/')[1] || null
    },
    'ASP.NET': {
      pattern: /ASP\.NET/i,
      getVersion: (value) => value.split('/')[1] || null
    },
    'Java': {
      pattern: /Java/i,
      getVersion: (value) => value.split('/')[1] || null
    },
    'Janusec': {
      pattern: /Janusec/i,
      getVersion: (value) => value.split('/')[1] || null,
      isSecurity: true,
      description: '通过X-Powered-By响应头识别到Janusec应用网关，为网站提供安全防护'
    },
    'WAF': {
      pattern: /WAF/i,
      getVersion: (value) => value.split('/')[1] || null,
      isSecurity: true,
      description: `通过X-Powered-By响应头识别到WAF防火墙，版本为${headerValue.split('/')[1] || '未知'}`
    }
  };

  for (const [tech, {pattern, getVersion, isSecurity, description}] of Object.entries(patterns)) {
    if (pattern.test(headerValue)) {
      const version = getVersion ? getVersion(headerValue) : null;
      if (isSecurity) {
        return {
          isSecurityComponent: true,
          name: tech,
          description: description,
          version: version
        };
      }
      return {
        name: tech,
        description: `通过X-Powered-By响应头识别，网站使用${tech}作为服务端语言${version ? '，版本号为' + version : ''}`
      };
    }
  }

  return null;
}

// 解析安全相关头部
function parseSecurityHeader(headerValue) {
  // 处理 360 防火墙
  if (headerValue.includes('zhuji.360.cn')) {
    const parts = headerValue.split(' ').filter(part => part.length > 0);
    return {
      name: '360安全防火墙',
      provider: parts[0],  // zhuji.360.cn
      version: parts[1],   // 1.0.8.8
      extra: parts[2],      // F1W1
      description: `通过X-Safe-Firewall响应头识别安全防护组件为360安全防火墙，版本号为${parts[1]}, 附带信息${parts[2]}`
    };
  }
  return null;
} 
// 统一的扫描器配置
const SCANNER_CONFIG = {
  // API 相关配置
  API: {
    PATTERN: /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\{\}\,\'\"\\])*?['"`]|['"`][a-zA_Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g,
    // 图片文件模式
    IMAGE_PATTERN: /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|mp3|mp4|m4a|wav|swf)(?:\?[^'"]*)?$/i,
    // JS文件模式
    JS_PATTERN: /\.(js|jsx|ts|tsx|less)(?:\?[^'"]*)?$/i,
    // 文档文件模式
    DOC_PATTERN: /\.(pdf|doc|docx|xls|xlsx|ppt|exe|apk|zip|7z|dll|dmg|pptx|txt|rar|md|csv)(?:\?[^'"]*)?$/i,
    // css字体模式
    FONT_PATTERN: /\.(ttf|eot|woff|woff2|otf|css)(?:\?[^'"]*)?$/i,
    // 需要跳过的第三方JS库正则匹配规则
    SKIP_JS_PATTERNS: [
      // jQuery相关
      /^jquery([.-]?\d*\.?\d*\.?\d*)?(?:[\.-]cookie)?(?:[\.-]fancybox)?(?:[\.-]validate)?(?:[\.-]artDialog)?(?:[\.-]blockui)?(?:[\.-]pack)?(?:[\.-]base64)?(?:[\.-]md5)?(?:[\.-]min)?\.js$/i,
      /^(?:vue|vue-router|vuex)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
      // React相关
      /^(react|react-dom)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
      // Bootstrap相关
      /^bootstrap(?:\.bundle)?[.-]?\d*\.?\d*\.?\d*(?:[\.-]datepicker|datetimepicker)?(?:[\.-]zh-CN)?(?:[\.-]min)?\.js$/i,
      // UI框架相关
      /^(layui|lay|layer|liger|h-ui|element-ui|ueditor|kindeditor|ant-design)[.-]?\d*\.?\d*\.?\d*(?:[\.-]all)?(?:\.admin)?(?:[\.-]config)?(?:[\.-]min)?\.js$/i,
      // 图表相关
      /^(echarts|chart|highcharts)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,     
      // 工具库相关
      /^(lodash|moment|tableexport|axios|plupload|pqgrid)[.-]?\d*\.?\d*\.?\d*(?:\.full)?(?:\.min)?\.js$/i,     
      // 其他常用库
      /^(polyfill|modernizr|device|less|isotope.pkgd|lhgdialog|kendo.web|dataTables|editor|seajs-style|seajs-text|tinymce|jsencrypt|backbone|select2|underscore|ext-all|ext-unigui-min|exporter|buttons|v5_float_4)[.-]?\d*\.?\d*\.?\d*(?:[\.-]dev)?(?:[\.-]html5|bootstrap|print|full)?(?:[\.-]min)?\.js$/i,      
      // 日期选择器
      /^(datepicker|datetimepicker|wdatepicker|laydate)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,   
      // 语言包
      /^(?:zh|en|zh-cn|zh-tw|ja|ko)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
    ],
    // 需要过滤的内容类型
    FILTERED_CONTENT_TYPES: [  
      'multipart/form-data',

      'node_modules/',

      'pause/break',
      'partial/ajax',

      'chrome/',
      'firefox/',
      'edge/',

      'examples/element-ui',
      'static/js/',
      'static/css/',
      'stylesheet/less',
      'jpg/jpeg/png/pdf',

      //日期类型
      'yyyy/mm/dd',
      'dd/mm/yyyy',
      'mm/dd/yy',
      'yy/mm/dd',
      'm/d/Y',
      'm/d/y',
      'xx/xx',

      'zrender/vml/vml'
    ]
  },

  // 域名相关配置
  DOMAIN: {
    // 域名白名单
    WHITELIST: [
      'github.com',
      '360.net',
      'bing.com',
      'csdn.net',
      'bilibili.com',
      'google.com',
      'youtube.com',
      'microsoft.com',
      'apple.com',
      'mozilla.org',
      'aliyun.com',
      'feishu.cn',
      'mklab.cn',
      'cnnvd.org.cn',
      'qq.com',
      'baidu.com'
    ],
    // 域名黑名单
    BLACKLIST: [
      'el.datepicker.today',
      'obj.style.top',
      'window.top',
      'mydragdiv.style.top',
      'container.style.top',
      'location.host',
      'page.info',
      'res.info',
      'item.info'
    ]
  },

  // IP 相关配置
  IP: {
    // 特殊 IP 范围（保留地址和特殊用途地址）
    SPECIAL_RANGES: [
      /^0\.0\.0\.0$/,          // 当前网络
      /^255\.255\.255\.255$/   // 广播地址
    ]
  },

  // 正则表达式模式
  PATTERNS: {
    // 域名匹配 - HTML页面
    DOMAIN: /\b(?:(?!this)[a-z0-9%-]+\.)*?(?:(?!this)[a-z0-9%-]{2,}\.)(?:wang|club|xyz|vip|top|beer|work|ren|technology|fashion|luxe|yoga|red|love|online|ltd|chat|group|pub|run|city|live|kim|pet|space|site|tech|host|fun|store|pink|ski|design|ink|wiki|video|email|company|plus|center|cool|fund|gold|guru|life|team|today|world|zone|social|bio|black|blue|green|lotto|organic|poker|promo|vote|archi|voto|fit|cn|website|press|icu|art|law|shop|band|media|cab|cash|cafe|games|link|fan|net|cc|com|fans|cloud|info|pro|mobi|asia|studio|biz|vin|news|fyi|tax|tv|market|shopping|mba|sale|co|org)(?:\:\d{1,5})?(?![a-zA-Z0-9._=>\(\);!}-])\b/g,
    // 域名匹配 - 资源文件
    DOMAIN_RESOURCE: /["'](?:(?:[a-z0-9]+:)?\/\/)?(?:(?!this)[a-z0-9%-]+\.)*?(?:[a-z0-9%-]{2,}\.)(?:wang|club|xyz|vip|top|beer|work|ren|technology|fashion|luxe|yoga|red|love|online|ltd|chat|group|pub|run|city|live|kim|pet|space|site|tech|host|fun|store|pink|ski|design|ink|wiki|video|email|company|plus|center|cool|fund|gold|guru|life|team|today|world|zone|social|bio|black|blue|green|lotto|organic|poker|promo|vote|archi|voto|fit|cn|website|press|icu|art|law|shop|band|media|cab|cash|cafe|games|link|fan|net|cc|com|fans|cloud|info|pro|mobi|asia|studio|biz|vin|news|fyi|tax|tv|market|shopping|mba|sale|co|org)(?![a-zA-Z0-9.])(?:\:\d{1,5})?\S*?["']/g,
    DOMAIN_FILTER: /\b(?:[a-zA-Z0-9%-]+\.)+[a-z]{2,10}(?:\:\d{1,5})?\b/,
    // IP 地址匹配 - HTML页面
    IP: /(?<!\.|\d)(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?::\d{1,5})?(?!\.|[0-9])/g,
    // IP 地址匹配 - 资源文件
    IP_RESOURCE: /["'](?:(?:[a-zA-Z0-9%-]+\:)?\/\/)?(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?::\d{1,5}|\/)?\S*?["']/g,
    get API() {
      return SCANNER_CONFIG.API.PATTERN;
    },
    PHONE: /(?<!\d|\.)(?:13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9]|198|199)\d{8}(?!\d)/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+(?!\.png)\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g,
    IDCARD: /(?:\d{8}(?:0\d|10|11|12)(?:[0-2]\d|30|31)\d{3}$)|(?:\d{6}(?:18|19|20)\d{2}(?:0[1-9]|10|11|12)(?:[0-2]\d|30|31)\d{3}(?:\d|X|x))(?!\d)/g,
    URL: /(?:https?|wss?|ftp):\/\/(?:(?:[\w-]+\.)+[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:\/[^\s\>\)\}\<'"]*)?/gi,
    JWT: /["'](?:ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\/+-]{10,}\.[A-Za-z0-9._\/+-]{10,})["']/g,
    COMPANY: /(?:[\u4e00-\u9fa5\（\）]{4,15}(?:公司|中心)|[\u4e00-\u9fa5]{2,15}(?:软件|科技|集团))(?!法|点|与|查)/g,
    CREDENTIALS: /(?:(['"])\b(?:\w*(?:pwd|pass|user|member|account|password|passwd|admin|root|system)[_-]?(?:id|name)?[0-9]*?)\1|\b(?:\w*(?:pwd|pass|user|account|password|passwd|admin|root|system)[_-]?(?:id|name)?[0-9]*?))\s*[:=]\s*(?:"(?!\+)[^\,\s\"\(]*"|'(?!\+)[^\,\s\'\(]*'|[\d\s]+)/gi,
    COOKIE: /\b\w*(?:token|PHPSESSID|JSESSIONID)\s*[:=]\s*["']?(?!localStorage)(?:[a-zA-Z0-9-]{4,})["']?/ig,
    get ID_KEY() {
      return {
        type: 'ID_KEY',
        patterns: SCANNER_CONFIG.ID_KEY.PATTERNS
      };
    }
  },

  // 统一的黑名单配置
  BLACKLIST: {
    // 值黑名单 - 从 ID_KEY 配置中移出
    VALUES: new Set([
      'input', 'about', 'video', 'null', 'top', 'gener', 'node', 'met', 'when', 'face',
      'login', 'read', 'black', 'hand', 'next', 'nect', 'system', 'panel', 'body',
      'load', 'red', 'green', 'shift', 'item', 'init', 'print','button','left',
      'finger', 'mark', 'down', 'up', 'ctrl', 'play', 'row', 'ntal', 'head', 'low',
      'has', 'range', 'new', 'json', 'url', 'uri', 'long', 'big','right', 'slid',
      'html', 'tion', 'default', 'set', 'serve','select', 'view', 'false', 'less',
      'broad', 'status', 'dom', 'use', 'rect', 'guard', 'index', 'link', 'close',
      'opera', 'main', 'tech','insert', 'char', 'core', 'turn',  'num', 'atom',
      'visual','get', 'type','write','error','array','parse','inter', 'size',
      'statis','card','extract','full','white','refer', 'wrap', 'emp', 'this',
      'crypt','normal','single','double','triple','more', 'age', 'clude', 'pect',
      'tool','tance','popper', 'radio', 'area', 'tip', 'color', 'hid', 'trans',
      'old', 'place', 'parm', 'axis', 'high', 'true', 'simple', 'bool', 'pick', 
      'date', 'cancel', 'croll', 'late', 'note', 'length', 'class', 'light',
      'param','tend', 'title', 'work','lang', 'func', 'able', 'dark', 'term',
      'data', 'object', 'brac', 'beare', 'str', 'self', 'void', 'apply', 'pace',
      'opts', 'token', 'sult', 'text', 'con', 'stor', 'sup', 'pun', 'back',
      'key', 'com', 'ent', 'case', 'pare', 'dent', 'reg', 'valid', 'blot',
      'pro', 'port', 'begin', 'fine','reif','cord', 'module', 'else', 'alias'
    ])
  },

  // ID密钥相关配置
  ID_KEY: {
    PATTERNS: [
      {name: '微信开放平台密钥', pattern: /wx[a-z0-9]{15,18}/g},
      {name: 'AWS密钥', pattern: /AKIA[0-9A-Z]{16}/g},  
      {name: '阿里云密钥', pattern: /LTAI[A-Za-z\d]{12,30}/g},
      {name: 'Google API密钥', pattern: /AIza[0-9A-Za-z_\-]{35}/g},
      {name: '腾讯云密钥', pattern: /AKID[A-Za-z\d]{13,40}/g},
      {name: '京东云密钥', pattern: /JDC_[0-9A-Z]{25,40}/g},
      {name: '其他AWS密钥', pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g},
      {name: '支付宝开放平台密钥', pattern: /(?:AKLT|AKTP)[a-zA-Z0-9]{35,50}/g},
      {name: 'GitLab Token1', pattern: /glpat-[a-zA-Z0-9\-=_]{20,22}/g},
      {name: 'GitHub Token2', pattern: /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}/g},
      {name: 'Apple开发者密钥', pattern: /APID[a-zA-Z0-9]{32,42}/g},
      {name: '企业微信密钥', pattern: /ww[a-z0-9]{15,18}/g},
      {name: 'key', pattern: /(?:['"]?(?:\w*(?:key|secret|oss|bucket)\w*)["']?)\s*[:=]\s*(?:"(?!\+)[^\,\s\"\(\>\<]*"|'(?!\+)[^\,\s\'\(\>\<]*'|[\d\s]+)/ig}
    ],

    // 关键词黑名单
    KEY_BLACKLIST: new Set([
      'size', 'row', 'dict', 'up', 'highlight', 'cabin', 'cross'
    ])
  }
};

// 导出配置
window.SCANNER_CONFIG = SCANNER_CONFIG;
window.API_CONFIG = SCANNER_CONFIG.API;
window.DOMAIN_CONFIG = SCANNER_CONFIG.DOMAIN;
window.IP_CONFIG = SCANNER_CONFIG.IP; 

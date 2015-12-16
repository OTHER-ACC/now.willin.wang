jQuery.browser = {};
(function () {
  jQuery.browser.msie = false;
  jQuery.browser.version = 0;
  if (navigator.userAgent.match(/MSIE ([0-9]+)\./)) {
    jQuery.browser.msie = true;
    jQuery.browser.version = RegExp.$1;
  }
})();
var w_lat, w_lng;
(function ($) {
  var Util = {
    support: {
      pjax: window.history && window.history.pushState && window.history.replaceState && !navigator.userAgent.match(/(iPod|iPhone|iPad|WebApps\/.+CFNetwork)/),
      storage: !!window.localStorage
    },
    toInt: function (obj) {
      return parseInt(obj);
    },
    stack: {},
    getTime: function () {
      return new Date * 1;
    },
    // 获取URL不带hash的部分,切去掉pjax=true部分
    getRealUrl: function (url) {
      url = (url || '').replace(/\#.*?$/, '');
      url = url.replace('?pjax=true&', '?').replace('?pjax=true', '').replace('&pjax=true', '');
      return url;
    },
    // 获取url的hash部分
    getUrlHash: function (url) {
      return url.replace(/^[^\#]*(?:\#(.*?))?$/, '$1');
    },
    // 获取本地存储的key
    getLocalKey: function (src) {
      var s = 'pjax_' + encodeURIComponent(src);
      return {
        data: s + '_data',
        time: s + '_time',
        title: s + '_title'
      };
    },
    // 清除所有的cache
    removeAllCache: function () {
      if (!Util.support.storage)
        return;
      for (var name in localStorage) {
        if ((name.split('_') || [''])[0] === 'pjax') {
          delete localStorage[name];
        }
      }
    },
    // 获取cache
    getCache: function (src, time, flag) {
      var item, vkey, tkey, tval;
      time = Util.toInt(time);
      if (src in Util.stack) {
        item = Util.stack[src], ctime = Util.getTime();
        if ((item.time + time * 1000) > ctime) {
          return item;
        } else {
          delete Util.stack[src];
        }
      } else if (flag && Util.support.storage) { // 从localStorage里查询
        var l = Util.getLocalKey(src);
        vkey = l.data;
        tkey = l.time;
        item = localStorage.getItem(vkey);
        if (item) {
          tval = Util.toInt(localStorage.getItem(tkey));
          if ((tval + time * 1000) > Util.getTime()) {
            return {
              data: item,
              title: localStorage.getItem(l.title)
            };
          } else {
            localStorage.removeItem(vkey);
            localStorage.removeItem(tkey);
            localStorage.removeItem(l.title);
          }
        }
      }
      return null;
    },
    // 设置cache
    setCache: function (src, data, title, flag) {
      var time = Util.getTime(), key;
      Util.stack[src] = {
        data: data,
        title: title,
        time: time
      };
      if (flag && Util.support.storage) {
        key = Util.getLocalKey(src);
        localStorage.setItem(key.data, data);
        localStorage.setItem(key.time, time);
        localStorage.setItem(key.title, title);
      }
    },
    // 清除cache
    removeCache: function (src) {
      src = Util.getRealUrl(src || location.href);
      delete Util.stack[src];
      if (Util.support.storage) {
        var key = Util.getLocalKey(src);
        localStorage.removeItem(key.data);
        localStorage.removeItem(key.time);
        localStorage.removeItem(key.title);
      }
    }
  };
  // pjax
  var pjax = function (options) {
    options = $.extend({
      selector: '',
      container: '',
      callback: function () {
      },
      fitler: function () {
      }
    }, options);
    if (!options.container || !options.selector) {
      throw new Error('selector & container options must be set');
    }
    $('body').delegate(options.selector, 'click', function (event) {
      if (event.which > 1 || event.metaKey) {
        return true;
      }
      var $this = $(this), href = $this.attr('href');
      // 过滤
      if (typeof options.filter === 'function') {
        if (options.filter.call(this, href, this) === true) {
          event.preventDefault();
          return true;
        }
      }
      if (href === location.href) {
        return true;
      }
      // 只是hash不同
      if (Util.getRealUrl(href) == Util.getRealUrl(location.href)) {
        var hash = Util.getUrlHash(href);
        if (hash) {
          $('html,body').animate({scrollTop: $('#' + hash).offset().top}, 500);
          options.callback && options.callback.call(this, {
            type: 'hash'
          });
        }
        return true;
      }
      event.preventDefault();
      options = $.extend(true, options, {
        url: href,
        element: this,
        title: '',
        push: true
      });
      // 发起请求
      pjax.request(options);
    });
  };
  pjax.xhr = null;
  pjax.options = {};
  pjax.state = {};

  // 默认选项
  pjax.defaultOptions = {
    timeout: 2000,
    element: null,
    cache: 24 * 3600, // 缓存时间, 0为不缓存, 单位为秒
    storage: true, // 是否使用localstorage将数据保存到本地
    url: '', // 链接地址
    push: true, // true is push, false is replace, null for do nothing
    show: '', // 展示的动画
    title: '', // 标题
    titleSuffix: '',// 标题后缀
    type: 'GET',
    data: {
      pjax: true
    },
    dataType: 'html',
    callback: null, // 回调函数
    // for jquery
    beforeSend: function (xhr) {
      $(pjax.options.container).trigger('pjax.start', [xhr, pjax.options]);
      xhr && xhr.setRequestHeader('X-PJAX', true);
    },
    error: function () {
      pjax.options.callback && pjax.options.callback.call(pjax.options.element, {
        type: 'error',
        url: pjax.options.url
      });
      //location.href = pjax.options.url;
    },
    complete: function (xhr) {
      $(pjax.options.container).trigger('pjax.end', [xhr, pjax.options]);
    }
  };
  // 展现动画
  pjax.showFx = {
    "_default": function (data, callback, isCached) {
      this.html(data);
      callback && callback.call(this, data, isCached);
    },
    fade: function (data, callback, isCached) {
      var $this = this;
      if (isCached) {
        $this.html(data);
        callback && callback.call($this, data, isCached);
      } else {
        this.fadeOut(500, function () {
          $this.html(data).fadeIn(500, function () {
            callback && callback.call($this, data, isCached);
          });
        });
      }
    }
  }
  // 展现函数
  pjax.showFn = function (showType, container, data, fn, isCached) {
    var fx = null;
    if (typeof showType === 'function') {
      fx = showType;
    } else {
      if (!(showType in pjax.showFx)) {
        showType = "_default";
      }
      fx = pjax.showFx[showType];
    }
    fx && fx.call(container, data, function () {
      var hash = location.hash;
      if (hash != '') {
        $('html,body').animate({scrollTop: $(hash).offset().top}, 500);
        //for FF
        if (/Firefox/.test(navigator.userAgent)) {
          history.replaceState($.extend({}, pjax.state, {
            url: null
          }), document.title);
        }
      } else {
        //$('html,body').animate({scrollTop: 0}, 500);
      }
      fn && fn.call(this, data, isCached);
    }, isCached);
  }
  // success callback
  pjax.success = function (data, isCached) {
    // isCached default is success
    if (isCached !== true) {
      isCached = false;
    }
//        if ((data || '').indexOf('<html') != -1) {
//            pjax.options.callback && pjax.options.callback.call(pjax.options.element, {
//                type : 'error'
//            });
//            location.href = pjax.options.url;
//            return false;
//        }
    var title = pjax.options.title || "", el;
    if (pjax.options.element) {
      el = $(pjax.options.element);
      title = el.attr('title') || el.text();
    }
    var matches = data.match(/<title>(.*?)<\/title>/);
    if (matches) {
      title = matches[1];
    }
    if (title) {
      if (title.indexOf(pjax.options.titleSuffix) == -1) {
        title += pjax.options.titleSuffix;
      }
    }
    document.title = title;
    pjax.state = {
      container: pjax.options.container,
      timeout: pjax.options.timeout,
      cache: pjax.options.cache,
      storage: pjax.options.storage,
      show: pjax.options.show,
      title: title,
      url: pjax.options.oldUrl
    };
    var query = $.param(pjax.options.data);
    if (query != "") {
      pjax.state.url = pjax.options.url + (/\?/.test(pjax.options.url) ? "&" : "?") + query;
    }

//        if (pjax.options.push) {
//            if (!pjax.active) {
//                history.replaceState($.extend({}, pjax.state, {
//                    url : null
//                }), document.title);
//                pjax.active = true;
//            }
//            history.pushState(pjax.state, document.title, pjax.options.oldUrl);
//        } else if (pjax.options.push === false) {
//            history.replaceState(pjax.state, document.title, pjax.options.oldUrl);
//        }
    pjax.options.showFn && pjax.options.showFn(data, function () {
      pjax.options.callback && pjax.options.callback.call(pjax.options.element, {
        type: isCached ? 'cache' : 'success'
      });
    }, isCached);
    // 设置cache
    if (pjax.options.cache && !isCached) {
      Util.setCache(pjax.options.url, data, title, pjax.options.storage);
    }
  };

  // 发送请求
  pjax.request = function (options) {
    options = $.extend(true, pjax.defaultOptions, options);
    var cache, container = $(options.container);
    options.oldUrl = options.url;
    options.url = Util.getRealUrl(options.url);
    if ($(options.element).length) {
      cache = Util.toInt($(options.element).attr('data-pjax-cache'));
      if (cache) {
        options.cache = cache;
      }
    }
    if (options.cache === true) {
      options.cache = 24 * 3600;
    }
    options.cache = Util.toInt(options.cache);
    // 如果将缓存时间设为0，则将之前的缓存也清除
    if (options.cache === 0) {
      Util.removeAllCache();
    }
    // 展现函数
    if (!options.showFn) {
      options.showFn = function (data, fn, isCached) {
        pjax.showFn(options.show, container, data, fn, isCached);
      };
    }
    pjax.options = options;
    pjax.options.success = pjax.success;
    if (options.cache && (cache = Util.getCache(options.url, options.cache, options.storage))) {
      options.beforeSend();
      options.title = cache.title;
      pjax.success(cache.data, true);
      options.complete();
      return true;
    }
    if (pjax.xhr && pjax.xhr.readyState < 4) {
      pjax.xhr.onreadystatechange = $.noop;
      pjax.xhr.abort();
    }
    pjax.xhr = $.ajax(pjax.options);
  };

  // popstate event
  var popped = ('state' in window.history), initialURL = location.href;
  $(window).bind('popstate', function (event) {
    var initialPop = !popped && location.href == initialURL;
    popped = true;
    if (initialPop) return;
    var state = event.state;
    if (state && state.container) {
      if ($(state.container).length) {
        var data = {
          url: state.url,
          container: state.container,
          push: null,
          timeout: state.timeout,
          cache: state.cache,
          storage: state.storage,
          title: state.title,
          element: null
        };
        pjax.request(data);
      } else {
        window.location = location.href;
      }
    }
  });

  // not support
  if (!Util.support.pjax) {
    pjax = function () {
      return true;
    };
    pjax.request = function (options) {
      if (options && options.url) {
        location.href = options.url;
      }
    };
  }
  // pjax bind to $
  $.pjax = pjax;
  $.pjax.util = Util;

  // extra
  if ($.inArray('state', $.event.props) < 0) {
    $.event.props.push('state')
  }

})(jQuery);

(function (w) {
  'use strict';
  w(document).ready(function () {
    //边栏计数样式修复
    w('.widget a').each(function (i, d) {
      w(d).html(w(d).html() + '<small class="count">' + w(d).siblings('span').html() + '</small>');
    });
    w('.tag-list-count,.category-list-count').remove();
    w('article p a,.widget a').each(function (i, d) {
      w(d).html('<span>' + w(d).html() + '</span>');
    });
    //消除focus虚线
    w('a,input[type="submit"],button[type="button"],object').bind('focus', function () {
      if (this.blur) {
        this.blur();
      }
    });
    //添加右下角浮动导航
    w('body').append('<div id="jquery-things"><a id="gohome" href="' + w('#logo a').attr('href') + '">Home</a><div id="gotop">^ TOP</div></div>');
    //返回顶部
    w(window).scroll(function () {
      if (w(this).scrollTop() != 0) {
        w('#gotop').fadeIn();
      } else {
        w('#gotop').fadeOut();
      }
    });
    w('#gotop').click(function () {
      w('body,html').animate({scrollTop: 0}, 800);
    });
    //if (typeof w.cookie('location') == 'undefined') {
      var geolocation = new BMap.Geolocation();
      if (geolocation) {
        geolocation.getCurrentPosition(getPositionSuccess, handleLocationError, {
          enableHighAccuracy: w('body').hasClass('mobile'),
          maximumAge: 3600000,
          timeout: 30000
        });
      }
    //}
    if (w('.navigation')[0]) {
      w(window).bind('scroll', function () {
        func_scoll();
      });
    }
    //加载动画
    daysAgo();
    w('#loading').fadeOut();
  });
})(jQuery);

var cd = function (input) {
  //format: y d h m s
  var dvalue = parseInt(new Date(input) - new Date(), 10) / 1000;
  var result = {
    sign: dvalue > 0 ? 1 : -1
  };
  dvalue = dvalue > 0 ? dvalue : -dvalue;

  result.seconds = parseInt(dvalue % 60, 10);
  result.minutes = parseInt(dvalue / 60 % 60, 10);
  result.hours = parseInt(dvalue / 3600 % 24, 10);
  result.totalDays = parseInt(dvalue / 86400, 10);
  result.years = parseInt(result.totalDays / 365, 10);
  result.days = parseInt(result.totalDays % 365, 10);

  return result;
};
//Time Ago
var daysAgo = function () {
  jQuery('.meta time').each(function (i, d) {
    var result = cd(jQuery(d).attr('datetime'));
    var html = (result.years > 0 ? result.years + '年' : '') + result.days + '天前';
    jQuery(d).html(html);
  });
};

var func_scoll = function () {
  var tmp = jQuery(window).scrollTop() + (document.documentElement.clientHeight);
  if (tmp > jQuery('.navigation').offset().top) {
    jQuery('.navigation .current').next('a').trigger('click');
  }
}

Date.prototype.Format = function (fmt) { //author: meizz
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

function handleLocationError(error) {
  switch (error.code) {
    case 0:
      console.log("尝试获取您的位置信息时发生错误：" + error.message);
      break;
    case 1:
      console.log("用户拒绝了获取位置信息请求。");
      break;
    case 2:
      console.log("浏览器无法获取您的位置信息：" + error.message);
      break;
    case 3:
      console.log("获取您位置信息超时。");
      break;
  }
  //To Do Sth;
}
function getPositionSuccess(position) {
  var lat = parseFloat(position.latitude);
  var lng = parseFloat(position.longitude);
  jQuery.cookie('location', lat.toFixed(6) + ',' + lng.toFixed(6));
  w_lat = lat;
  w_lng = lng;
  create_geolocation(lat, lng);
  console.log(jQuery.cookie('location'));
}
function create_geolocation(lat, lng) {
  jQuery('.geolocation').each(function (i, d) {
    var tmp_lat = jQuery(d).data('lat'), tmp_lng = jQuery(d).data('lng');
    var dist = getDistance(lat, lng, tmp_lat, tmp_lng);
    if (dist < 1000)
      jQuery(d).html(dist.toFixed(2) + 'M');
    else
      jQuery(d).html((dist / 1000).toFixed(2) + 'KM');
    jQuery(d).parent('span').hide();
    jQuery(d).parent('span').removeClass('hide');
    jQuery(d).parent('span').fadeIn();
  });

}

/* Geolocation */
var EARTH_RADIUS = 6378137.0;    //单位M
var PI = Math.PI;

function getRad(d) {
  return d * PI / 180.0;
}

function getDistance(lat1, lng1, lat2, lng2) {
  var f = getRad((lat1 + lat2) / 2);
  var g = getRad((lat1 - lat2) / 2);
  var l = getRad((lng1 - lng2) / 2);

  var sg = Math.sin(g);
  var sl = Math.sin(l);
  var sf = Math.sin(f);

  var s, c, w, r, d, h1, h2;
  var a = EARTH_RADIUS;
  var fl = 1 / 298.257;

  sg = sg * sg;
  sl = sl * sl;
  sf = sf * sf;

  s = sg * (1 - sl) + (1 - sf) * sl;
  c = (1 - sg) * (1 - sl) + sf * sl;

  w = Math.atan(Math.sqrt(s / c));
  r = Math.sqrt(s * c) / w;
  d = 2 * w * a;
  h1 = (3 * r - 1) / 2 / c;
  h2 = (3 * r + 1) / 2 / s;

  return d * (1 + fl * (h1 * sf * (1 - sg) - h2 * (1 - sf) * sg));
}

jQuery(document).ready(function () {
  $.pjax({
    selector: '.navigation a',
    container: '.timeline', //内容替换的容器
    show: 'custom',//支持默认和fade, 可以自定义动画方式，这里为自定义的function即可。
    cache: false,  //是否使用缓存
    storage: false,  //是否使用本地存储
    titleSuffix: '', //标题后缀
    filter: function (href) {
      return false;
    },
    callback: function (data) {
      var type = data.type;
      switch (type) {
        case 'cache':
        case 'success':

          break;
        case 'hash':
          break;
        case 'error':

          break;
      }
    }
  })

  $('#main').bind('pjax.start', function () {
    $(window).unbind('scroll');
    $('#loading').fadeIn();
  })

  $('#main').bind('pjax.end', function () {
    if (w_lat) create_geolocation(w_lat, w_lng);
    $('#loading').fadeOut();
    daysAgo();
    $(window).bind('scroll', function () {
      func_scoll();
    });
  })
});

$.extend($.pjax.showFx, {
  custom: function (data, callback, isCached) {
    data = data.split(' class="timeline"')[1];
    data = data.substring(data.indexOf('>') + 1);
    var depth = 1;
    var output = '';
    var temp, i, pos;
    while (depth > 0) {
      temp = data.split('</ul>')[0];
      //count occurrences
      i = 0;
      pos = temp.indexOf("<ul");
      while (pos != -1) {
        i++;
        pos = temp.indexOf("<ul", pos + 1);
      }
      //end count
      depth = depth + i - 1;
      output = output + data.split('</ul>')[0] + '</ul>';
      data = data.substring(data.indexOf('</ul>') + 5);
    }
    var $this = this;
    $this.append(output);
    var curpage = $('.current').next('a');
    $('.current').removeClass('current');
    curpage.addClass('current');
    callback && callback.call($this, data, isCached);
  }
});


/*!
 * jQuery Cookie Plugin v1.3.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else {
    // Browser globals.
    factory(jQuery);
  }
}

(function ($) {

  var pluses = /\+/g;

  function decode(s) {
    if (config.raw) {
      return s;
    }
    try {
      // If we can't decode the cookie, ignore it, it's unusable.
      return decodeURIComponent(s.replace(pluses, ' '));
    } catch (e) {
    }
  }

  function decodeAndParse(s) {
    if (s.indexOf('"') === 0) {
      // This is a quoted cookie as according to RFC2068, unescape...
      s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    s = decode(s);

    try {
      // If we can't parse the cookie, ignore it, it's unusable.
      return config.json ? JSON.parse(s) : s;
    } catch (e) {
    }
  }

  var config = $.cookie = function (key, value, options) {

    // Write
    if (value !== undefined) {
      options = $.extend({}, config.defaults, options);

      if (typeof options.expires === 'number') {
        var days = options.expires, t = options.expires = new Date();
        t.setDate(t.getDate() + days);
      }

      value = config.json ? JSON.stringify(value) : String(value);

      return (document.cookie = [
        config.raw ? key : encodeURIComponent(key),
        '=',
        config.raw ? value : encodeURIComponent(value),
        options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
        options.path ? '; path=' + options.path : '',
        options.domain ? '; domain=' + options.domain : '',
        options.secure ? '; secure' : ''
      ].join(''));
    }

    // Read

    var result = key ? undefined : {};

    // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all. Also prevents odd result when
    // calling $.cookie().
    var cookies = document.cookie ? document.cookie.split('; ') : [];

    for (var i = 0, l = cookies.length; i < l; i++) {
      var parts = cookies[i].split('=');
      var name = decode(parts.shift());
      var cookie = parts.join('=');

      if (key && key === name) {
        result = decodeAndParse(cookie);
        break;
      }

      // Prevent storing a cookie that we couldn't decode.
      if (!key && (cookie = decodeAndParse(cookie)) !== undefined) {
        result[name] = cookie;
      }
    }

    return result;
  };

  config.defaults = {};

  $.removeCookie = function (key, options) {
    if ($.cookie(key) !== undefined) {
      // Must not alter options, thus extending a fresh object...
      $.cookie(key, '', $.extend({}, options, {expires: -1}));
      return true;
    }
    return false;
  };

}));
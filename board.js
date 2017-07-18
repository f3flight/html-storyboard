/*jshint esversion: 6, browser: true */
/*global alert, confirm, JSZip */
const board = (() => {
  "use strict";

  var canvas_w,
    canvas_h,
    storage_canvas = document.createElement('canvas'),
    points = [],
    draw_context = null,
    draw_color = '#000000',
    draw_alpha = '1.0',
    line_width = 2,
    file_input,
    console,
    page_prototype,
    board_container;

  const log = (text) => {
    console.innerHTML += '<br>';
    console.innerHTML += console._line_num + ': ' + text;
    console._line_num += 1;
    console.scrollTop = console.scrollHeight;
  };
  const get_position = (el) => {
    let x_pos = 0,
      y_pos = 0,
      x_scroll = 0,
      y_scroll = 0;
    while (el) {
      if (el.tagName === "BODY") {
        // deal with browser quirks with body/window/document and page scroll
        x_scroll = el.scrollLeft || document.documentElement.scrollLeft;
        y_scroll = el.scrollTop || document.documentElement.scrollTop;
        x_pos += (el.offsetLeft - x_scroll + el.clientLeft);
        y_pos += (el.offsetTop - y_scroll + el.clientTop);
      } else {
        // for all other non-BODY elements
        x_pos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
        y_pos += (el.offsetTop - el.scrollTop + el.clientTop);
      }
      el = el.offsetParent;
    }
    return {
      x: x_pos,
      y: y_pos
    };
  };
  const get_xy = (obj, e) => {
    var my_e = e.type.startsWith('touch') ? e.changedTouches[0] : e,
      obj_pos = get_position(obj);
    return {
      x: my_e.clientX - obj_pos.x,
      y: my_e.clientY - obj_pos.y
    };
  };
  const get_page = (obj) => obj.classList.contains('board_page') ? obj : get_page(obj.parentElement);
  const get_canvas = (obj) => get_page(obj).getElementsByTagName('canvas')[0];
  const file_save = (blob, filename) => {
    var a = document.createElement('a'),
      url = URL.createObjectURL(blob);
    a.setAttribute('download', filename);
    a.setAttribute('href', url);
    a.click();
    URL.revokeObjectURL(url);
  };
  const file_load = (func) => {
    file_input = document.createElement('input');
    file_input.setAttribute('type', 'file');
    file_input.setAttribute('style', 'display: none');
    file_input.addEventListener('change', func);
    file_input.onerror = () => log('file_input - error');
    file_input.click();
  };
  const padnum = (num, max) => {
    num = num + '';
    const len = (max + '').length;
    return num.length < len ? "0".repeat(len - 1) + num : num;
  };
  const gen_filename = (pre, ind, maxind, ext) => pre + '_' + padnum(ind, maxind) + '.' + ext;
  const to_filename = (text) => {
    return text.replace(' ', '_').replace(/([^a-z0-9_]+)/gi, '').toLowerCase();
  };
  const storyboard_name = () => {
    const header_value = document.getElementById('header').value,
      header_placeholder = document.getElementById('header').placeholder;
    return header_value ? header_value : header_placeholder;
  };
  const page_to_blob_promise = (canvas) => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        log('blob created, size ' + blob.size);
        resolve({
          blob: blob,
          caption: canvas._caption.innerHTML
        });
      }, 'image/png');
    });
  };
  const draw_image = (e) => {
    log('draw_image - error check: ' + !e.returnValue);
    const ctx = e.target._ctx,
      w = e.target.naturalWidth,
      h = e.target.naturalHeight,
      w_scale = w / ctx.canvas.width,
      h_scale = w / ctx.canvas.width,
      scale = w_scale >= h_scale ? w_scale : h_scale;
    ctx.globalAlpha = 1.0; //do not draw images semi-transparent
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(e.target,
      (ctx.canvas.width - w / scale) / 2,
      (ctx.canvas.height - h / scale) / 2,
      w / scale, h / scale);
  };
  const do_draw = (e) => {
    draw_context.globalAlpha = 1.0;
    draw_context.clearRect(0, 0,
      draw_context.canvas.width,
      draw_context.canvas.height);
    draw_context.drawImage(storage_canvas, 0, 0);
    draw_context.globalAlpha = draw_alpha;
    points.push(get_xy(draw_context.canvas, e));
    draw_context.beginPath();
    draw_context.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      draw_context.lineTo(points[i].x, points[i].y);
    }
    draw_context.stroke();
  };
  const draw_start = (e) => {
    storage_canvas.setAttribute('width', e.target.width);
    storage_canvas.setAttribute('height', e.target.height);
    storage_canvas.getContext('2d').drawImage(e.target, 0, 0);
    draw_context = e.target.getContext('2d');
    draw_context.strokeStyle = draw_color;
    draw_context.lineWidth = line_width;
    draw_context.lineCap = 'round';
    draw_context.lineJoin = 'round';
    points.push(get_xy(e.target, e));
  };
  const draw_continue = (e) => {
    if (draw_context) {
      e.preventDefault();
      do_draw(e);
    }
  };
  const draw_end = (e) => {
    if (draw_context) {
      e.preventDefault();
      do_draw(e);
      draw_context = null;
      points = [];
    }
  };
  const page_remove = (obj) => board_container.removeChild(get_page(obj));
  const page_clean = (obj) => {
    const c = get_canvas(obj);
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };
  const page_save = (obj) => {
    const c = get_canvas(obj);
    const index = [...document.getElementsByTagName('canvas')].indexOf(c),
      maxindex = document.getElementsByTagName('canvas').length - 1;
    page_to_blob_promise(c).then((item) => {
      file_save(item.blob, gen_filename(to_filename(storyboard_name()), index, maxindex, 'png'));
    });
  };
  const page_load = (obj) => {
    log('page_load');
    const image = new Image();
    image._ctx = get_canvas(obj).getContext('2d');
    const load_do = e => {
      log('load_do');
      if (e.target.files.length > 0) {
        log('load_do - file(s) selected');
        log('load_do - files[0] = ' + e.target.files[0]);
        log('load_do - files[0].type = ' + e.target.files[0].type);
        log('load_do - files[0].size = ' + e.target.files[0].size);
        var file_reader = new FileReader();
        file_reader.onerror = function () {
          log('file_reader - error');
        };
        file_reader.onloadend = function (e) {
          log('file_reader.onloadend - error check: ' + e.target.error);
          image.onload = draw_image;
          image.src = e.target.result;
        };
        file_reader.readAsDataURL(e.target.files[0]);
      }
    };
    image.onerror = () => log('image - error');
    file_load(load_do);
  };
  const create_page = () => {
    const new_page = page_prototype.cloneNode(true);
    new_page.removeAttribute('id');
    const canvas = new_page.getElementsByTagName('canvas')[0];
    canvas.setAttribute('width', canvas_w);
    canvas.setAttribute('height', canvas_h);
    canvas.addEventListener('mousedown', draw_start);
    canvas.addEventListener('mousemove', draw_continue);
    canvas.addEventListener('mouseup', draw_end);
    canvas.addEventListener('touchstart', draw_start);
    canvas.addEventListener('touchmove', draw_continue);
    canvas.addEventListener('touchend', draw_end);
    canvas._caption = new_page.getElementsByClassName('caption')[0];
    board_container.appendChild(new_page);
    return canvas;
  };
  const set_alpha = (e) => {
    draw_alpha = e.target.value / 255;
  };
  const set_size = (e) => {
    line_width = e.target.value;
  };
  const set_color = (e) => {
    draw_color = e.target.value;
  };
  const add_button = (parent, reference, action, text) => {
    var button = document.createElement('div');
    button.setAttribute('class', 'right-side border small white button');
    button.innerHTML = text;
    button._reference = reference;
    button.addEventListener('click', action);
    parent.appendChild(button);
  };
  const save_all = () => {
    var canvases = [...document.getElementsByTagName('canvas')];
    var to_blobs = canvases.map(page_to_blob_promise);
    Promise.all(to_blobs).then((items) => {
      log('all blobs done');
      const zip = new JSZip(),
        name = storyboard_name(),
        prefix = to_filename(name);
      zip.folder('txt').file('name.txt', name);
      for (var i = 0; i < items.length; i++) {
        log('adding blob ' + i + ' into the zip object');
        zip.folder('img').file(gen_filename(prefix, i, items.length - 1, 'png'), items[i].blob);
        zip.folder('txt').file(gen_filename(prefix, i, items.length - 1, 'txt'), items[i].caption);
      }
      log('all blobs added into the zip object');
      zip.generateAsync({
        type: "blob"
      }).then(function (blob) {
        log('saving zip blob');
        file_save(blob, prefix + '.zip');
      });
    });
  };
  const load_all = () => {
    log('load_all');
    var load_all_do = function (e) {
      log('file_input.onchange - load_all_do - type = ' + e.target.files[0].type);
      if (e.target.files[0].type.search(/zip/i) === -1) {
        if (!confirm("The selected file's MIME type has no zip' in it, are you sure this is a zip archive?")) {
          return;
        }
      }
      var unzip = new JSZip();
      const pages = [...board_container.getElementsByClassName('board_page')];
      unzip.loadAsync(e.target.files[0]).then((zip) => {
        log('unzip.loadAsync');
        var img_promises = [],
          txt_promises = [];
        zip.folder('img').forEach((path, file) => {
          log('zip.forEach - folder img');
          log('path = ' + path + '; file = ' + file.name);
          img_promises.push(file.async("base64"));
        });
        zip.folder('txt').forEach((path, file) => {
          log('zip.forEach - folder txt');
          if (path === 'name.txt') {
            file.async('string').then((text) => {
              if (text != document.getElementById('header').placeholder) {
                document.getElementById('header').value = text;
              }
            });
          } else {
            txt_promises.push(file.async("string"));
          }
        });
        Promise.all(img_promises).then((data) => {
          log('Promise.all - all images extracted');
          log('image data array length = ' + data.length);
          for (let i in data) {
            var img = new Image();
            const canvas = pages.length > i ? get_canvas(pages[i]) : create_page();
            img.onload = draw_image;
            img._ctx = canvas.getContext('2d');
            log('data ' + i + ' length = ' + data[i].length);
            img.src = 'data:image/png;base64,' + data[i];
          }
          if (pages.length > data.length) {
            for (let i = data.length; i < pages.length; i++) {
              pages[i].parentElement.removeChild(pages[i]);
            }
          }
        }).then(() => {
          Promise.all(txt_promises).then((data) => {
            log('Promise.all - all text extracted');
            log('text data array length = ' + data.length);
            const canvases = [...document.getElementsByTagName('canvas')];
            for (var i in canvases) {
              log('setting caption ' + i);
              canvases[i]._caption.innerHTML = data[i];
            }
          });
        }).then(() => {});
      });
    };
    file_load(load_all_do);
  };
  const console_toggle = () => {
    var console_ph = document.getElementById('console_placeholder'),
      console = document.getElementById('console');
    console_ph.style.display = console_ph.style.display === "block" ? "none" : "block";
    console.style.display = console.style.display === "block" ? "none" : "block";
  };
  const monitor_ram = () => {
    for (var x in window.performance.memory) {
      log('memory: ' + x + ' = ' + window.performance.memory[x] / 100000 + 'MB');
    }
    log('memory: ========================');
    setTimeout(monitor_ram, 2000);
  };
  const get_page_prototype = () => page_prototype;
  const init = () => {
    page_prototype = document.getElementById('board_page_prototype');
    page_prototype.parentElement.removeChild(page_prototype);
    board_container = document.getElementById('board_container');
    canvas_w = getComputedStyle(document.body).getPropertyValue('--canvas-width');
    canvas_h = getComputedStyle(document.body).getPropertyValue('--canvas-height');
    document.addEventListener('mousemove', draw_continue);
    document.addEventListener('mouseup', draw_end);
    document.getElementById('console')._line_num = 0;
    document.getElementById('toggle').addEventListener('click', () => {
      const ctl = document.getElementById('sliding_controls');
      ctl.style.left = ctl.style.left === '0px' ? getComputedStyle(document.body).getPropertyValue('--controls-left') : '0px';
    });
    console = document.getElementById('console');
    //monitor_ram();
  };

  return {
    init: init,
    create_page: create_page,
    save_all: save_all,
    load_all: load_all,
    console_toggle: console_toggle,
    set_alpha: set_alpha,
    set_size: set_size,
    set_color: set_color,
    page_remove: page_remove,
    page_save: page_save,
    page_load: page_load,
    page_clean: page_clean,
    get_page_prototype: get_page_prototype
  };
})();

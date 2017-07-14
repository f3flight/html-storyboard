/*jshint esversion: 6, browser: true */
/*global alert, confirm, JSZip */
(function () {
  "use strict";

  const f_log = (text) => {
    const console = document.getElementById('console');
    console.innerHTML += '<br>';
    console.innerHTML += console._line_num + ': ' + text;
    console._line_num += 1;
    console.scrollTop = console.scrollHeight;
  };
  const f_get_position = (el) => {
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
  const f_get_xy = (obj, e) => {
    var my_e = e.type.startsWith('touch') ? e.changedTouches[0] : e,
      obj_pos = f_get_position(obj);
    return {
      x: my_e.clientX - obj_pos.x,
      y: my_e.clientY - obj_pos.y
    };
  };
  const f_save_as = (blob, filename) => {
    var a = document.createElement('a'),
      url = URL.createObjectURL(blob);
    a.setAttribute('download', filename);
    a.setAttribute('href', url);
    a.click();
    URL.revokeObjectURL(url);
  };
  const f_gen_filename = (prefix, index, maxindex, extension) => {
    return prefix + '_' + f_padnum(index, maxindex) + '.' + extension;
  };
  const f_storyboard_name = () => {
    const header_value = document.getElementById('header').value,
      header_placeholder = document.getElementById('header').placeholder;
    return header_value ? header_value : header_placeholder;
  };
  const f_set_storyboard_name = (text) => {
    const header = document.getElementById('header');
  };
  const f_to_filename = (text) => {
    return text.replace(' ', '_').replace(/([^a-z0-9_]+)/gi, '').toLowerCase();
  };
  const f_padnum = (num, max) => (num + '').length < (max + '').length ? "0".repeat((max + '').length - 1) + num : num + '';
  const f_canvas_to_blob_promise = (canvas) => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        f_log('blob created, size ' + blob.size);
        resolve({
          blob: blob,
          caption: canvas._caption.innerHTML
        });
      }, 'image/png');
    });
  };
  var pages = document.getElementById('pages'),
    canvas_w = getComputedStyle(document.body).getPropertyValue('--canvas-width'),
    canvas_h = getComputedStyle(document.body).getPropertyValue('--canvas-height'),
    storage_canvas = document.createElement('canvas'),
    points = [],
    draw_context = null,
    draw_color = '#000000',
    draw_alpha = '1.0',
    line_width = 2,
    do_draw = function (e) {
      draw_context.globalAlpha = 1.0;
      draw_context.clearRect(0, 0,
        draw_context.canvas.width,
        draw_context.canvas.height);
      draw_context.drawImage(storage_canvas, 0, 0);
      draw_context.globalAlpha = draw_alpha;
      points.push(f_get_xy(draw_context.canvas, e));
      draw_context.beginPath();
      draw_context.moveTo(points[0].x, points[0].y);
      for (var i = 1; i < points.length; i++) {
        draw_context.lineTo(points[i].x, points[i].y);
      }
      draw_context.stroke();
    },
    draw_start = function (e) {
      storage_canvas.setAttribute('width', e.target.width);
      storage_canvas.setAttribute('height', e.target.height);
      storage_canvas.getContext('2d').drawImage(e.target, 0, 0);
      draw_context = e.target.getContext('2d');
      draw_context.strokeStyle = draw_color;
      draw_context.lineWidth = line_width;
      draw_context.lineCap = 'round';
      draw_context.lineJoin = 'round';
      points.push(f_get_xy(e.target, e));
    },
    draw_continue = function (e) {
      if (draw_context) {
        e.preventDefault();
        do_draw(e);
      }
    },
    draw_end = function (e) {
      if (draw_context) {
        e.preventDefault();
        do_draw(e);
        draw_context = null;
        points = [];
      }
    },
    remove = function () {
      pages.removeChild(this._reference);
    },
    clean = function () {
      this._reference.getContext('2d').clearRect(0, 0, this._reference.width, this._reference.height);
    },
    save_single = function (e) {
      const index = [...document.getElementsByTagName('canvas')].indexOf(e.target._reference),
        maxindex = document.getElementsByTagName('canvas').length - 1;
      f_canvas_to_blob_promise(e.target._reference).then((item) => {
        f_save_as(item.blob, f_gen_filename(f_to_filename(f_storyboard_name()), index, maxindex, 'png'));
      });
    },
    load = function () {
      f_log('load');
      var file_input = document.createElement('input'),
        ctx = this._reference.getContext('2d'),
        image = new Image(),
        load_do = function () {
          f_log('load_do');
          if (this.files.length > 0) {
            f_log('load_do - file(s) selected');
            f_log('load_do - files[0] = ' + this.files[0]);
            f_log('load_do - files[0].type = ' + this.files[0].type);
            f_log('load_do - files[0].size = ' + this.files[0].size);
            var file_reader = new FileReader();
            file_reader.onerror = function () {
              f_log('file_reader - error');
            };
            file_reader.onloadend = function (e) {
              f_log('file_reader.onloadend - error check: ' + this.error);
              image.onload = function (e) {
                f_log('image.onload - error check: ' + !e.returnValue);
                var w = e.target.naturalWidth,
                  h = e.target.naturalHeight,
                  w_scale = w / ctx.canvas.width,
                  h_scale = w / ctx.canvas.width,
                  scale = w_scale >= h_scale ? w_scale : h_scale;
                ctx.globalAlpha = draw_alpha;
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.drawImage(e.target,
                  (ctx.canvas.width - w / scale) / 2,
                  (ctx.canvas.height - h / scale) / 2,
                  w / scale, h / scale);
              };
              image.src = e.target.result;
            };
            file_reader.readAsDataURL(this.files[0]);
          }
        };
      file_input.setAttribute('type', 'file');
      file_input.setAttribute('style', 'display: none');
      file_input.addEventListener('change', load_do);
      image.onerror = function () {
        f_log('image - error');
      };
      file_input.onerror = function () {
        f_log('file_input - error');
      };
      file_input.click();
    },
    set_alpha = function () {
      draw_alpha = this.value / 255;
    },
    set_size = function () {
      line_width = this.value;
    },
    set_color = function () {
      draw_color = this.value;
    };

  function add_button(parent, reference, action, text) {
    var button = document.createElement('div');
    button.setAttribute('class', 'right-side border small white button');
    button.innerHTML = text;
    button._reference = reference;
    button.addEventListener('click', action);
    parent.appendChild(button);
  }

  function create_page() {
    var table = document.createElement('table'),
      tr = document.createElement('tr'),
      tr2 = document.createElement('tr'),
      tr3 = document.createElement('tr'),
      canvas_td = document.createElement('td'),
      canvas = document.createElement('canvas'),
      top_button_td = document.createElement('td'),
      bottom_button_td = document.createElement('td'),
      caption_td = document.createElement('td'),
      caption = document.createElement('div');
    table.setAttribute('class', 'margined');
    canvas_td.setAttribute('rowspan', 2);
    canvas.setAttribute('class', 'border white');
    canvas.setAttribute('class', 'border white');
    canvas.setAttribute('width', canvas_w);
    canvas.setAttribute('height', canvas_h);
    canvas._xy = {
      x: -1,
      y: -1
    };
    canvas.addEventListener('mousedown', draw_start);
    canvas.addEventListener('mousemove', draw_continue);
    canvas.addEventListener('mouseup', draw_end);
    canvas.addEventListener('touchstart', draw_start);
    canvas.addEventListener('touchmove', draw_continue);
    canvas.addEventListener('touchend', draw_end);
    canvas._caption = caption;
    pages.appendChild(table);
    table.appendChild(tr);
    tr.appendChild(canvas_td);
    canvas_td.appendChild(canvas);
    top_button_td.setAttribute('class', 'top');
    tr.appendChild(top_button_td);
    add_button(top_button_td, table, remove, 'X');
    table.appendChild(tr2);
    bottom_button_td.setAttribute('class', 'bottom');
    tr2.appendChild(bottom_button_td);
    add_button(bottom_button_td, canvas, save_single, 'SAVE');
    add_button(bottom_button_td, canvas, load, 'LOAD');
    add_button(bottom_button_td, canvas, clean, 'WIPE');
    table.appendChild(tr3);
    caption_td.setAttribute('class', 'caption_td');
    tr3.appendChild(caption_td);
    caption.setAttribute('contenteditable', 'true');
    caption.setAttribute('class', 'white border caption');
    caption.setAttribute('placeholder', 'caption');
    caption_td.appendChild(caption);
    return canvas;
  }

  function save_all() {
    var canvases = [...document.getElementsByTagName('canvas')];
    var to_blobs = canvases.map(f_canvas_to_blob_promise);
    Promise.all(to_blobs).then((items) => {
      f_log('all blobs done');
      const zip = new JSZip(),
        storyboard_name = f_storyboard_name(),
        prefix = f_to_filename(storyboard_name);
      zip.folder('txt').file('name.txt', storyboard_name);
      for (var i = 0; i < items.length; i++) {
        f_log('adding blob ' + i + ' into the zip object');
        zip.folder('img').file(f_gen_filename(prefix, i, items.length - 1, 'png'), items[i].blob);
        zip.folder('txt').file(f_gen_filename(prefix, i, items.length - 1, 'txt'), items[i].caption);
      }
      f_log('all blobs added into the zip object');
      zip.generateAsync({
        type: "blob"
      }).then(function (blob) {
        f_log('saving zip blob');
        f_save_as(blob, prefix + '.zip');
      });
    });
  }

  function load_all() {
    f_log('load_all');
    var file_input = document.createElement('input');
    var load_all_do = function (e) {
      f_log('file_input.onchange - load_all_do - type = ' + e.target.files[0].type);
      if (e.target.files[0].type.search(/zip/i) === -1) {
        if (!confirm("The selected file's MIME type has no zip' in it, are you sure this is a zip archive?")) {
          return;
        }
      }
      var unzip = new JSZip();
      unzip.loadAsync(e.target.files[0]).then((zip) => {
        f_log('unzip.loadAsync');
        var img_promises = [],
          txt_promises = [];
        zip.folder('img').forEach((path, file) => {
          f_log('zip.forEach - folder img');
          f_log('path = ' + path + '; file = ' + file.name);
          img_promises.push(file.async("base64"));
        });
        zip.folder('txt').forEach((path, file) => {
          f_log('zip.forEach - folder txt');
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
          f_log('Promise.all - all images extracted');
          f_log('image data array length = ' + data.length);
          var draw = (e) => {
            f_log('img.onload - drawing loaded image');
            e.target._canvas.getContext('2d').drawImage(e.target, 0, 0);
          };
          for (var i in data) {
            var img = new Image();
            var canvas = create_page();
            img.onload = draw;
            img._canvas = canvas;
            f_log('data ' + i + ' length = ' + data[i].length);
            img.src = 'data:image/png;base64,' + data[i];
          }
        }).then(() => {
          Promise.all(txt_promises).then((data) => {
            f_log('Promise.all - all text extracted');
            f_log('text data array length = ' + data.length);
            const canvases = [...document.getElementsByTagName('canvas')];
            for (var i in canvases) {
              f_log('setting caption ' + i);
              canvases[i]._caption.innerHTML = data[i];
            }
          });
        });
      });
    };
    file_input.setAttribute('type', 'file');
    file_input.setAttribute('style', 'display: none');
    file_input.addEventListener('change', load_all_do);
    file_input.click();
  }

  function console_toggle() {
    var console_ph = document.getElementById('console_placeholder'),
      console = document.getElementById('console');
    console_ph.style.display = console_ph.style.display === "block" ? "none" : "block";
    console.style.display = console.style.display === "block" ? "none" : "block";
  }

  function monitor_ram() {
    for (var x in window.performance.memory) {
      f_log('memory: ' + x + ' = ' + window.performance.memory[x] / 100000 + 'MB');
    }
    f_log('memory: ========================');
    setTimeout(monitor_ram, 2000);
  }

  document.addEventListener('mousemove', draw_continue);
  document.addEventListener('mouseup', draw_end);
  document.getElementById('add').addEventListener('click', create_page);
  document.getElementById('save_all').addEventListener('click', save_all);
  document.getElementById('load_all').addEventListener('click', load_all);
  document.getElementById('debug').addEventListener('click', console_toggle);
  document.getElementById('console')._line_num = 0;
  document.getElementById('alpha_picker').addEventListener('change', set_alpha);
  document.getElementById('size_picker').addEventListener('change', set_size);
  document.getElementById('color_picker').addEventListener('change', set_color);
  document.getElementById('toggle').addEventListener('click', () => {
    const ctl = document.getElementById('sliding_controls');
    ctl.style.left = ctl.style.left === '0px' ? '95%' : '0px';
  });
  //monitor_ram();
}());

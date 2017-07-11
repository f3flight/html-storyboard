(function () {
  "use strict";
  /*jshint browser: true */
  function log(text) {
    var console = document.getElementById('console');
    console.innerHTML += '<br>';
    console.innerHTML += console._line_num + ': ' + text;
    console._line_num += 1;
    console.scrollTop = console.scrollHeight;
  }

  function HTR(h) {return parseInt((cutHex(h)).substring(0,2),16);}
  function HTG(h) {return parseInt((cutHex(h)).substring(2,4),16);}
  function HTB(h) {return parseInt((cutHex(h)).substring(4,6),16);}
  function cutHex(h) {return (h.charAt(0)=="#") ? h.substring(1,7):h;}

  function getPosition(el) {
    var xPos = 0,
      yPos = 0,
      xScroll = 0,
      yScroll = 0;
    while (el) {
      if (el.tagName === "BODY") {
        // deal with browser quirks with body/window/document and page scroll
        xScroll = el.scrollLeft || document.documentElement.scrollLeft;
        yScroll = el.scrollTop || document.documentElement.scrollTop;
        xPos += (el.offsetLeft - xScroll + el.clientLeft);
        yPos += (el.offsetTop - yScroll + el.clientTop);
      } else {
        // for all other non-BODY elements
        xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
        yPos += (el.offsetTop - el.scrollTop + el.clientTop);
      }
      el = el.offsetParent;
    }
    return {
      x: xPos,
      y: yPos
    };
  }

  function get_xy(obj, e) {
    var my_e = e.type.startsWith('touch') ? e.changedTouches[0] : e,
      obj_pos = getPosition(obj);
    return {
      x: my_e.clientX - obj_pos.x,
      y: my_e.clientY - obj_pos.y
    };
  }

  var pages = document.getElementById('pages'),
    canvas_w = getComputedStyle(document.body).getPropertyValue('--canvas-width'),
    canvas_h = getComputedStyle(document.body).getPropertyValue('--canvas-height'),
    last_canvas = null,
    is_drawing = false,
    draw_color = '#000000',
    draw_alpha = '1.0',
    line_width = 2,
    do_draw = function (canvas, e) {
      if (is_drawing && last_canvas === canvas) {
        var new_xy = get_xy(canvas, e),
          context = canvas.getContext('2d');
        if (canvas._xy.x >= 0) {
          context.strokeStyle = draw_color;
          context.globalAlpha = draw_alpha;
          context.lineWidth = line_width;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.beginPath();
          context.moveTo(canvas._xy.x, canvas._xy.y);
          context.lineTo(new_xy.x, new_xy.y);
          context.closePath();
          context.stroke();
        }
        canvas._xy = new_xy;
      }
    },
    draw_start = function (e) {
      e.preventDefault();
      this._xy = get_xy(this, e);
      is_drawing = true;
      last_canvas = this;
    },
    draw = function (e) {
      e.preventDefault();
      do_draw(this, e);
    },
    draw_end = function (e) {
      e.preventDefault();
      do_draw(this, e);
      is_drawing = false;
    },
    remove = function () {
      pages.removeChild(this._reference);
    },
    clean = function () {
      this._reference.getContext('2d').clearRect(0, 0, this._reference.width, this._reference.height);
    },
    save = function () {
      var canvases = document.getElementsByTagName('canvas'),
        canvases_arr = Array.prototype.slice.call(canvases),
        index = canvases_arr.indexOf(this._reference),
        header_value = document.getElementById('header').value,
        header_placeholder = document.getElementById('header').placeholder,
        filename = header_value ? header_value : header_placeholder,
        data_url = this._reference.toDataURL("image/png"),
        a = document.createElement('a');
      filename = filename.replace(' ', '_').replace(/([^a-z0-9_]+)/gi, '').toLowerCase();
      a.setAttribute('download', filename + '_' + index + '.png');
      a.setAttribute('href', data_url);
      a.click();
    },
    load = function () {
      log('load');
      var file_input = document.createElement('input'),
        ctx = this._reference.getContext('2d'),
        image = new Image(),
        load_do = function () {
          log('load_do');
          if (this.files.length > 0) {
            log('load_do - file(s) selected');
            log('load_do - files[0] = ' + this.files[0]);
            log('load_do - files[0].type = ' + this.files[0].type);
            log('load_do - files[0].size = ' + this.files[0].size);
            var file_reader = new FileReader();
            file_reader._input = this;
            file_reader.onloadend = function (e) {
              log('file_reader.onloadend - setting image src');
              image.onload = function (e) {
                log('image.onload - drawing');
                ctx.clearRect(0, 0, 1000, 1000); //temporary numbers
                ctx.drawImage(e.target, 0, 0);
              };
              image.src = e.target.result;
            };
            file_reader.readAsDataURL(this.files[0]);
          }
        };
      file_input.setAttribute('type', 'file');
      file_input.setAttribute('style', 'display: none');
      file_input.addEventListener('change', load_do);
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

  function addButton(parent, reference, action, text) {
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
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', draw_end);
    canvas.addEventListener('touchstart', draw_start);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', draw_end);
    pages.appendChild(table);
    table.appendChild(tr);
    tr.appendChild(canvas_td);
    canvas_td.appendChild(canvas);
    top_button_td.setAttribute('class', 'top');
    tr.appendChild(top_button_td);
    addButton(top_button_td, table, remove, 'X');
    table.appendChild(tr2);
    bottom_button_td.setAttribute('class', 'bottom');
    tr2.appendChild(bottom_button_td);
    addButton(bottom_button_td, canvas, save, 'SAVE');
    addButton(bottom_button_td, canvas, load, 'LOAD');
    addButton(bottom_button_td, canvas, clean, 'WIPE');
    table.appendChild(tr3);
    caption_td.setAttribute('class', 'caption_td');
    tr3.appendChild(caption_td);
    caption.setAttribute('contenteditable', 'true');
    caption.setAttribute('class', 'white border caption');
    caption.setAttribute('placeholder', 'caption');
    caption_td.appendChild(caption);
  }

  function disable_default_mouse_action(e) {
    e.preventDefault();
  }

  function keep_drawing(e) {
    if (last_canvas && is_drawing) {
      do_draw(last_canvas, e);
    }
  }

  function stop_drawing(e) {
    if (last_canvas && is_drawing) {
      do_draw(last_canvas, e);
      is_drawing = false;
    }
  }

  function save_all() {
    var canvases = document.getElementsByTagName('canvas');
    log(canvases.length);
    for (var i = 0; i < canvases.length; i += 1) {
      log('i = ' + i);
      var data_url = canvases[i].toDataURL("image/png");
      var a = document.createElement('a');
      a.setAttribute('download', 'image' + i + '.png');
      a.setAttribute('href', data_url);
      a.click();
      break;
    }
  }

  document.addEventListener('mousemove', keep_drawing);
  document.addEventListener('mouseup', stop_drawing);
  document.getElementById('add').addEventListener('click', create_page);
  document.getElementById('save_all').addEventListener('click', save_all);
  document.getElementById('console')._line_num = 0;
  document.getElementById('alpha_picker').addEventListener('change', set_alpha);
  document.getElementById('size_picker').addEventListener('change', set_size);
  document.getElementById('color_picker').addEventListener('change', set_color);
}());

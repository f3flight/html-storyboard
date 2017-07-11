(function () {
  "use strict";
  /*jslint nomen: true*/
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

  var drawing_area_width = 800,
    drawing_area_height = 500,
    pages = document.getElementById('pages'),
    last_canvas = null,
    is_drawing = false,
    draw_color = '#000000',
    line_width = 2,
    do_draw = function (canvas, e) {
      if (is_drawing && last_canvas === canvas) {
        var new_xy = get_xy(canvas, e),
          context = canvas.getContext('2d');
        if (canvas._xy.x >= 0) {
          context.strokeStyle = draw_color;
          context.lineWidth = line_width;
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
    load_image = function () {
      var file_input = document.createElement('input'),
        ctx = this._reference.getContext('2d'),
        image = new Image(),
        self_destruct = function () {
          if (this.files.length > 0) {
            var file_reader = new FileReader();
            file_reader.onload = function (e) {
              image.onload = function (e) {
                ctx.drawImage(e.target, 0, 0);
              };
              image.src = e.target.result;
            };
            file_reader.readAsDataURL(this.files[0]);
          }
        };
      file_input.setAttribute('type', 'file');
      file_input.setAttribute('style', 'display: none');
      file_input.addEventListener('change', self_destruct);
      file_input.click();
    };



  function addButton(parent, reference, action, text) {
    var button = document.createElement('div');
    button.setAttribute('class', 'right-side border small white button');
    button.innerHTML = text;
    button._reference = reference;
    button.addEventListener('click', action);
    parent.appendChild(button);
  }

  function createPage() {
    var table = document.createElement('table'),
      tr = document.createElement('tr'),
      canvas_td = document.createElement('td'),
      canvas = document.createElement('canvas'),
      top_button_td = document.createElement('td'),
      tr2 = document.createElement('tr'),
      bottom_button_td = document.createElement('td');
    table.setAttribute('class', 'margined');
    canvas_td.setAttribute('rowspan', 2);
    canvas.setAttribute('width', drawing_area_width);
    canvas.setAttribute('height', drawing_area_height);
    canvas.setAttribute('class', 'border white');
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
    addButton(bottom_button_td, canvas, load_image, 'L');
    bottom_button_td.setAttribute('class', 'bottom');
    tr2.appendChild(bottom_button_td);
    addButton(bottom_button_td, canvas, clean, 'O');
  }

  function disable_default_mouse_action(e) {
    e.preventDefault();
  }

  function keep_drawing(e) {
    e.preventDefault();
    if (last_canvas && is_drawing) {
      do_draw(last_canvas, e);
    }
  }

  document.addEventListener('mousedown', disable_default_mouse_action);
  document.addEventListener('mousemove', keep_drawing);
  document.addEventListener('mouseup', disable_default_mouse_action);
  document.getElementById('add').addEventListener('click', createPage);
}());

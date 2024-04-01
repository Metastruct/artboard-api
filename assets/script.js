/*!Copyright Meta Construct
 SPDX-License-Identifier: Apache-2.0
*/

/* eslint no-undef: 0 */

const FRICTION = 0.25;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 64;
const ZOOM_PER_WHEEL = 0.25;
const WALL_OPACITY = 0.6;

class Artboard {
  constructor() {
    this.statusText = document.querySelector('.status-text');
    this.info = document.querySelector('.info');
    this.avatar = this.info.querySelector('.avatar');
    this.nickname = this.info.querySelector('.nickname');
    this.canvas = document.querySelector('#canvas');
    this.externalCanvas = document.querySelector('#external');

    this.context = this.canvas.getContext('2d');
    this.external = this.externalCanvas.getContext('2d');

    this.dimensions = [ 640, 160 ];
    this.size = 3;
    this.offset = [0, 0];
    this.velocity = [0, 0];
    this.speed = [0, 0];
    this.cache = {};
    this.drag = false;
    this.click = false;
    /** @type {ImageInfoData|boolean} */
    this.data = false;
    this.oldMouse = [ 0, 0 ];
    this.mouse = [ 0, 0 ];
    this.lock = false;
    this.wall = new Image;
    this.wall.src = '/images/wall.png';
    this.time = 0;

    this.onResize = this.onResize.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.renderCanvas = this.renderCanvas.bind(this);
    this.processReceivedMessage = this.processReceivedMessage.bind(this);

    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseout', this.onMouseUp);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('wheel', this.onWheel);

    window.requestAnimationFrame(this.renderCanvas);

    this.onResize();
    this.openConnection();
  }

  onMouseUp() {
    if (!this.drag)
      this.updateInformationElement(true);

    this.click = false;
    this.drag = false;
  }

  onMouseDown(event) {
    this.oldMouse[0] = event.clientX;
    this.oldMouse[1] = event.clientY;
    this.velocity[0] = 0;
    this.velocity[1] = 0;
    this.click = true;
  }

  onMouseMove(event) {
    if (this.click)
      this.drag = true;

    this.mouse[0] = event.clientX;
    this.mouse[1] = event.clientY;
    this.updateInformationElement();
  }

  onWheel(event) {
    const { width, height } = this.canvas;

    const direction = Math.sign(-event.deltaY);
    const size = direction * ZOOM_PER_WHEEL * this.size;
    if (this.size + size <= MIN_ZOOM || this.size + size >= MAX_ZOOM) return;

    const wx = (event.x - this.offset[0]) / (width * this.size);
    const wy = (event.y - this.offset[1]) / (height * this.size);

    this.offset[0] -= wx * width * size;
    this.offset[1] -= wy * height * size;
    this.size += size;
    this.updateInformationElement();
  }

  onResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.renderImage();
  }

  openConnection(i = 0) {
    /** @suppress {checkTypes} */
    this.ws = new WebSocket(document.location.origin.replace('http', 'ws'));
    this.status('Connecting...', true);

    this.ws.addEventListener('error', (e) => {
      this.status('WebSocket spew out an error, check DevTools console.');
      console.error(e);
    });

    this.ws.addEventListener('close', () => {
      if (i <= 3)
        this.openConnection(i + 1)
      else
        this.status('Unable to reconnect. You may need to refresh the page.');
    });

    this.ws.addEventListener('open', () => {
      this.status();
      i = 0;
    });

    /** @suppress {checkTypes} */
    this.ws.addEventListener('message', this.processReceivedMessage);
  }

  status(msg = undefined, load = false) {
    switch (true) {
      case msg !== undefined:
        this.statusText.innerHTML = msg;
        break;
      case this.data !== undefined:
        console.log(this.data);
        this.statusText.innerHTML = `Current palette: <a href="${this.data.paletteURL}">${this.data.paletteURL}</a>`;
        break;
      default:
        this.statusText.innerHTML = 'Nothing is working!!';
    }

    if (load)
      this.statusText.innerHTML = '<div class="loader"></div>' + this.statusText.innerHTML;
  }

  /**
   * @suppress {misplacedTypeAnnotation}
   * @param {WSMessageEvent} event
   */
  async processReceivedMessage(event) {
    const msg = /** @type {WSParsedMessage} */ JSON.parse(event.data);
    const { op, data } = msg;

    switch (op) {
      case 'imageData': {
        const { data: imageData, dimensions } = /** @type {ImageInfo} */ data;
        this.data = imageData;

        this.dimensions = dimensions;
        this.status();

        if (!window.location.hash) break;

        const values = window.location.hash
          .slice(1)
          .split(';')
          .map(x => +x)
          .filter((v, k) => !isNaN(v) && isFinite(v) && v >= 0 && v < this.dimensions[k]);

        if (values.length < 2) break;

        const hashJump = values.map(Math.floor);

        const xy = hashJump[1] * this.dimensions[0] + hashJump[0];
        const steamId = this.data.steamIDs[xy];
        if (steamId) {
          await this.getSteamProfileInfo(steamId, false);

          this.size = MAX_ZOOM / 2;
          this.offset = [
            window.innerWidth / 2 - (hashJump[0] + 0.5) * this.size,
            window.innerHeight / 2 - (hashJump[1] + 0.5) * this.size
          ];

          this.updateInformationElement(hashJump);
        }
      } break;

      case 'addPixel': {
        const { xy, color, steamId } = /** @type {AddPixel} */ data;
        this.data.image[xy] = color;
        this.data.steamIDs[xy] = steamId;
      } break;

      case 'imageUpdate': {
        const { diff, steamId } = /** @type {ImageUpdate} */ data;
        for (const position in diff) {
          const color = diff[position] - 1;
          const xy = +position;
          this.data.steamIDs[xy] = steamId;
          this.data.image[xy] = color;
        }
      } break;
    }

    this.renderImage();
  }

  renderCanvas(time) {
    const deltaTime = this.time ? time - this.time : 0;
    this.time = time;

    this.update(deltaTime);

    const { width, height } = this.canvas;
    this.context.clearRect(0, 0, width, height);
    this.context.save();

    this.context.imageSmoothingEnabled = false;

    this.context.translate(this.offset[0], this.offset[1]);
    this.context.scale(this.size, this.size);

    this.context.globalAlpha = WALL_OPACITY;

    if (this.wall.complete) {
      for (let x = 0; x < this.dimensions[0]; x += this.dimensions[1]) {
        const wallWidth = this.dimensions[1] - Math.max(0, x + this.dimensions[1] - this.dimensions[0]);

        this.context.drawImage(
          this.wall,
          0,
          0,
          this.wall.width * wallWidth / this.dimensions[1],
          this.wall.height,
          x,
          0,
          wallWidth,
          this.dimensions[1]
        );
      }
    }

    this.context.globalAlpha = 1;

    this.context.drawImage(
      this.externalCanvas,
      0,
      0,
      this.dimensions[0],
      this.dimensions[1]
    );

    this.context.restore();

    window.requestAnimationFrame(this.renderCanvas);
  }

  update(deltaTime) {
    if (this.drag || this.click) {
      if (this.mouse[0] !== this.oldMouse[0] && this.mouse[1] !== this.oldMouse[1]) {
        const [cx, cy] = this.mouse;
        const dx = cx - this.oldMouse[0],
          dy = cy - this.oldMouse[1];

        this.offset[0] += dx;
        this.offset[1] += dy;
        this.speed = [ dx, dy ];

        this.oldMouse = [ cx, cy ];
      } else
        this.speed = [ 0, 0 ];

      return;
    }

    this.velocity[0] += this.speed[0] * (60 / 1000) * deltaTime;
    this.velocity[1] += this.speed[1] * (60 / 1000) * deltaTime;

    let speed = Math.hypot(this.velocity[0], this.velocity[1]);
    const angle = Math.atan2(this.velocity[1], this.velocity[0]);

    if (speed > FRICTION)
      speed -= FRICTION * (60 / 1000) * deltaTime
    else
      speed = 0;

    this.velocity = [
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    ];

    this.offset[0] += this.velocity[0] * (60 / 1000) * deltaTime;
    this.offset[1] += this.velocity[1] * (60 / 1000) * deltaTime;

    if (this.lock && (this.velocity[0] !== 0 || this.velocity[1] !== 0))
      this.updateInformationElement();

    this.speed = [0, 0];
  }

  getSteamProfileInfo(sid, lazy = true) {
    if (this.cache[sid]) return this.cache[sid];

    const promise = fetch('/get/' + sid)
      .then(res => res.json())
      .then(json => {
        this.cache[sid] = json;
        this.updateInformationElement();
      })
      .catch(() => delete this.cache[sid]);

    if (!lazy)
      return promise;

    return this.cache[sid] = { avatar: '', nickname: 'Loading...' };
  }

  /**
   * @suppress {misplacedTypeAnnotation}
   */
  updateInformationElement(keep = false) {
    if (!this.data || !this.data.steamIDs) return;

    let mouse = [
      Math.floor((this.mouse[0] - this.offset[0]) / this.size),
      Math.floor((this.mouse[1] - this.offset[1]) / this.size)
    ];

    if (this.lock)
      mouse = this.lock
    else if (Array.isArray(keep))
      mouse = keep;

    this.info.style.left = this.offset[0] + (mouse[0] + 0.5) * this.size + 'px';
    this.info.style.top = this.offset[1] + mouse[1] * this.size + 'px';

    const xy = mouse[1] * this.dimensions[0] + mouse[0];
    const steamId = this.data.steamIDs[xy];

    if (keep) {
      if (steamId && this.lock === false) {
        this.lock = mouse;
        this.info.classList.add('locked');
        window.location.hash = this.lock.join(';');
      } else {
        this.lock = false;
        this.info.classList.remove('locked');
        window.location.hash = '';
      }
    } else if (this.lock)
      return;

    if (mouse[0] >= 0 && mouse[0] <= this.dimensions[0] - 1 && steamId) {
      const res = this.getSteamProfileInfo(steamId) /** @type {SteamResponse} */;

      this.info.classList.remove('hidden');

      this.nickname.innerHTML = res.nickname;
      this.nickname.href = `https://steamcommunity.com/profiles/${steamId}`;

      const color = this.data.image[xy];
      this.avatar.style.outlineColor = color === -1 ?
        'rgb(' + this.data.palette[color] + ')' :
        'transparent';
      this.avatar.src = res.avatar;
    } else if (!this.lock)
      this.info.classList.add('hidden');
  }

  renderImage() {
    if (!this.data) return;

    this.externalCanvas.width = this.dimensions[0];
    this.externalCanvas.height = this.dimensions[1];

    this.external.clearRect(0, 0, this.dimensions[0], this.dimensions[1]);

    this.data.image.forEach((color, xy) => {
      if (color == -1) return;
      const x = xy % this.dimensions[0];
      const y = (xy - x) / this.dimensions[0];

      this.external.fillStyle = 'rgb(' + this.data.palette[color].join(',') + ')';
      this.external.fillRect(x, y, 1, 1);
    });
  }
};

window.$browenv = new Artboard();

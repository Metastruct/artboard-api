/*!Copyright Meta Construct
 SPDX-License-Identifier: Apache-2.0
*/

/* eslint no-undef: 0 */
class BrowserEnviroment {
  constructor() {
    this.errorElem = document.querySelector('.error');
    this.infoElem = document.querySelector('.info');
    this.avatarElem = document.querySelector('.avatar');
    this.nicknameElem = document.querySelector('.nickname');
    this.canvasElem = document.querySelector('#canvas');
    this.externalCanvas = document.querySelector('#external');
    this.canvasCtx = this.canvasElem.getContext('2d');
    this.externalCtx = this.externalCanvas.getContext('2d');
    this.palette = null;
    this.steamIDs = {};
    this.image = null;
    this.imageWidth = 320;
    this.imageHeight = 80;
    this.imageBlob = null;
    this.size = 10;
    this.isDragging = false;
    this.offsetCoords = [0, 0];
    this.mouseCoords = [0, 0];
    this.oldMouseCoords = [0, 0];
    this.cache = {};

    this.onResize();
    this.openConnection();
    this.setupWindowEvents();
  }

  setupWindowEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener(
      'mouseup',
      () => (this.isDragging = false)
    );
    window.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.oldMouseCoords = [e.clientX, e.clientY];
    });
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.oldMouseCoords[0],
          dy = e.clientY - this.oldMouseCoords[1];

        this.offsetCoords[0] += dx;
        this.offsetCoords[1] += dy;

        this.oldMouseCoords = [e.clientX, e.clientY];
      }
    });
    window.addEventListener('wheel', ({ x, y, deltaY }) => {
      const { width, height } = this.canvasElem;

      const direction = deltaY > 0 ? -1 : 1;
      const size = direction * 0.5;
      if (this.size + size <= 0.2) return;

      const wx = (x - this.offsetCoords[0]) / (width * this.size);
      const wy = (y - this.offsetCoords[1]) / (height * this.size);

      this.offsetCoords[0] -= wx * width * size;
      this.offsetCoords[1] -= wy * height * size;
      this.size += size;
    });
    this.canvasElem.addEventListener('mousemove',
      (e) => (this.mouseCoords = [e.clientX, e.clientY])
    );

    window.requestAnimationFrame(() => this.renderCanvas());
  }

  getSteamNameAvatar(sid) {
    if (this.cache[sid]) return this.cache[sid];
    this.cache[sid] = { avatar: '', nickname: 'loading...' };

    let xhr = new XMLHttpRequest();
    xhr.open('GET', `http://${document.location.host}/get/${sid}`);
    xhr.send();
    xhr.onload = () => {
      if (xhr.readyState == xhr.DONE && xhr.status == 200)
        this.cache[sid] = JSON.parse(xhr.responseText);
    };

    return this.cache[sid];
  }

  onResize() {
    const width = this.canvasElem.clientWidth;
		const height = this.canvasElem.clientHeight;

    if (this.canvasElem.width !== width || this.canvasElem.height !== height) {
			this.canvasElem.width = width;
			this.canvasElem.height = height;
		}
    this.renderImage();
  }

  openConnection(i = 0) {
    /** @suppress {checkTypes} */
    this.ws = new WebSocket(`ws://${document.location.host}:10010/`);

    this.ws.addEventListener('error', (e) => {
      this.error(true, 'Error occurred!');
      console.error(e);
    });

    this.ws.addEventListener('close', () => {
      this.error(true, 'WebSocket connection has closed.');
      if (i <= 3) this.openConnection(i + 1);
    });

    this.ws.addEventListener('open', () => {
      this.error(false);
      i = 0;
    });

    this.ws.addEventListener('message', ({ data }) =>
      this.processReceivedMessage(data)
    );
  }

  error(show, errorMsg = '') {
    show = show
      ? this.errorElem.classList.remove('hidden')
      : this.errorElem.classList.add('hidden');
    this.errorElem.innerHTML = errorMsg;
  }

  /**
   * Shut up.
   * @suppress {misplacedTypeAnnotation}
   */
  processReceivedMessage(received) {
    const msg = /** @type {WSMessage} */ JSON.parse(received);
    const { op, data } = msg;

    switch (op) {
      case 'imageInfo':
        const { palette, image, steamIDs } = /** @type {ImageInfo} */ data;
        this.palette = palette;
        this.image = image;
        this.steamIDs = steamIDs;
        break;
      case 'addPixel':
        const { xy, color, steamId } = /** @type {AddPixel} */ data;
        this.image[xy] = color;
        this.steamIDs[xy] = steamId;
        console.log(steamId, 'placed a pixel at', xy);
    }

    this.renderImage();
  }

  renderCanvas() {
    if (this.imageBlob) {
      this.update();
      this.canvasCtx.save();

      const { width, height } = this.canvasElem;
      this.canvasCtx.clearRect(0, 0, width, height);
      this.canvasCtx.imageSmoothingEnabled = false;

      this.canvasCtx.translate(this.offsetCoords[0], this.offsetCoords[1]);
      this.canvasCtx.scale(this.size, this.size);

      this.canvasCtx.drawImage(
        this.imageBlob,
        0,
        0,
        this.imageWidth,
        this.imageHeight
      );

      this.canvasCtx.restore();
    }

    window.requestAnimationFrame(() => this.renderCanvas());
  }

  update() {
    const {
      infoElem,
      mouseCoords,
      offsetCoords,
      nicknameElem,
      avatarElem,
    } = this;

    const elem = document.elementFromPoint(mouseCoords[0], mouseCoords[1]);
    if (elem == infoElem && infoElem.className.indexOf('hidden') < 0) return;

    const mx = Math.floor((mouseCoords[0] - offsetCoords[0]) / this.size),
      my = Math.floor((mouseCoords[1] - offsetCoords[1]) / this.size);
    const xy = my * this.imageWidth + mx;
    const steamId = this.steamIDs[xy];
    if (mx >= 0 && mx <= this.imageWidth - 1 && steamId) {
      const res = this.getSteamNameAvatar(steamId) /** @type {SteamResponse} */;

      infoElem.classList.remove('hidden');
      infoElem.style.top = offsetCoords[1] + my * this.size + 'px';
      infoElem.style.left = offsetCoords[0] + mx * this.size + 'px';

      nicknameElem.innerHTML = res.nickname;
      nicknameElem.href = `https://steamcommunity.com/profiles/${steamId}`;
      avatarElem.src = res.avatar;
      try {
        avatarElem.load();
      } catch (err) {}
    } else this.infoElem.classList.add('hidden');
  }

  renderImage() {
    if (!this.image || !this.palette)
      return console.error(
        'renderImage() was called when image or palette was not present'
      );

    this.externalCanvas.width = this.imageWidth;
    this.externalCanvas.height = this.imageHeight;

    this.externalCtx.fillStyle = '#FFF';
    this.externalCtx.fillRect(0, 0, this.imageWidth, this.imageHeight);

    this.image.forEach((color, xy) => {
      //xy++;
      const x = xy % this.imageWidth;
      const y = (xy - x) / this.imageWidth;

      let rgb = this.palette[color] || [255, 255, 255];
      this.externalCtx.fillStyle = `rgb(${rgb.join(',')})`;
      this.externalCtx.fillRect(x, y, 1, 1);
    });

    this.externalCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      this.imageBlob = new Image();
      this.imageBlob.src = url;
    });
  }
}

window.$browenv = new BrowserEnviroment();

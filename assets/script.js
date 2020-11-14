/*!Copyright Meta Construct
 SPDX-License-Identifier: Apache-2.0
*/

/* eslint no-undef: 0 */
class BrowserEnviroment {
  constructor() {
    this.errorElem = document.querySelector('.error');
    this.canvasElem = document.querySelector('#canvas');
    this.externalCanvas = document.querySelector('#external');
    this.canvasCtx = this.canvasElem.getContext('2d');
    this.externalCtx = this.externalCanvas.getContext('2d');
    this.imageWidth = 320;
    this.imageHeight = 80;
    this.imageBlob = null;
    this.size = 10;
    this.offsetCoords = [0, 0];
    this.oldMouseCoords = [0, 0];
    this.isDragging = false;
    this.palette = null;
    this.image = null;

    this.onResize();
    this.openConnection();
    this.setupWindowEvents();
  }

  setupWindowEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mouseup', () => (this.isDragging = false));
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
      if ((this.size + size) <= 0.2) return;

      const wx = (x - this.offsetCoords[0]) / (width * this.size);
      const wy = (y - this.offsetCoords[1]) / (height * this.size);

      this.offsetCoords[0] -= wx * width * size;
      this.offsetCoords[1] -= wy * height * size;
      this.size += size;
    });

    window.requestAnimationFrame(() => this.renderCanvas());
  }

  onResize() {
    this.canvasElem.width = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );
    this.canvasElem.height = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    this.renderImage();
  }

  openConnection(i = 0) {
    /** @suppress {checkTypes} */
    this.ws = new WebSocket(`ws://${document.location.host}/`);

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
        const { palette, image } = /** @type {ImageInfo} */ data;
        this.palette = palette;
        this.image = image;
        break;
      case 'addPixel':
        const { xy, color, steamId } = /** @type {AddPixel} */ data;
        this.image[xy] = color;
        console.log(steamId, 'placed a pixel at', xy);
    }

    this.renderImage();
  }

  renderCanvas() {
    if (this.imageBlob) {
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

class BrowserEnviroment {
  constructor() {
    this.errorElem = document.querySelector('.error');
    this.canvasElem = document.querySelector('canvas');

    if (this.canvasElem.getContext)
      this.canvasCtx = this.canvasElem.getContext('2d');

    this.openConnection();
    this.render();
  }

  openConnection() {
    this.ws = new WebSocket(`ws://${document.location.host}/`);

    this.ws.addEventListener('error', (e) => {
      this.error(true, 'Error occurred!');
      console.error(e);
    });

    this.ws.addEventListener('close', () => {
      this.error(true, 'WebSocket connection has closed.');
      this.openConnection();
    });

    this.ws.addEventListener('open', () => this.error(false));

    this.ws.addEventListener('message', ({ data }) =>
      this.processReceivedMessage(data)
    );
  }

  error(show, errorMsg) {
    show = show ? 'remove' : 'add';
    this.errorElem.classList[show]('hidden');
    this.errorElem.innerHTML = errorMsg || '';
  }

  processReceivedMessage(received) {
    let { op, data } = JSON.parse(received);

    switch(op) {
      case 'imageInfo':
        this.palette = data.palette;
        this.image = data.image;
        break;
      case 'addPixel':
        console.log(data.steam)
    }

    this.render();
  }

  render() {
    if (!this.image || !this.palette || !this.canvasCtx)
      console.error(
        'render() was called when image, palette or canvas context was not present'
      );
  }
}

new BrowserEnviroment();

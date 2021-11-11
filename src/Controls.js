export default class Controls {
  constructor (document, canvas, entity) {
    this.document = document;
    this.canvas = canvas;
    this.entity = entity;

    this.initKeyboardControls();
    this.initMouseControls();
  }

  initKeyboardControls() {
    this.keyState = new Set();

    const handleKeyDown = (e) => this.keyState.add(e.key);
    const handleKeyUp = (e) => this.keyState.delete(e.key);

    this.document.addEventListener('keydown', handleKeyDown, false);
    this.document.addEventListener('keyup', handleKeyUp, false);
  }

  initMouseControls() {
    const lockChangeAlert = () => {
      if (this.document.pointerLockElement === this.canvas || this.document.mozPointerLockElement === this.canvas) {
        console.log('The pointer lock status is now locked');
        this.document.addEventListener("mousemove", updatePosition, false);
      } else {
        console.log('The pointer lock status is now unlocked');  
        this.document.removeEventListener("mousemove", updatePosition, false);
      }
    }

    const updatePosition = (e) => {
      let dX = -e.movementX;
      let dY = -e.movementY;

      const SENSITIVITY = 40.0;

      if (dX != 0) {
        this.entity.rotateOnUpGlobal(dX/this.canvas.width * SENSITIVITY);
      }

      if (dY != 0) {
        this.entity.rotateOnRightLocal(dY/this.canvas.height * SENSITIVITY);
      }
    }

    this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
    this.document.exitPointerLock = this.document.exitPointerLock || this.document.mozExitPointerLock;

    this.canvas.onclick = () => this.canvas.requestPointerLock()

    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
  }

  checkKeyPress() {
    const m = 0.1;

    if (this.keyState.has('w')) {
      this.entity.moveForwardLocal(m);
    }

    if (this.keyState.has('s')) {
      this.entity.moveForwardLocal(-m);
    }

    if (this.keyState.has('a')) {
      this.entity.moveRightLocal(-m);
    }

    if (this.keyState.has('d')) {
      this.entity.moveRightLocal(m);
    }

    if (this.keyState.has('e')) {
      this.entity.moveUpLocal(m);
    }

    if (this.keyState.has('q')) {
      this.entity.moveUpLocal(-m);
    }
  }
}
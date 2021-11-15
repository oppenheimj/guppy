export default class Controls {
  constructor (document, canvas, controlMap, mouseMap) {
    this.document = document;
    this.canvas = canvas;

    this.initKeyboardControls(controlMap);
    this.initMouseControls(mouseMap);
  }

  initKeyboardControls(controlMap) {
    this.controlMap = controlMap;
    this.keyState = new Set();

    const handleKeyDown = (e) => this.keyState.add(e.key);
    const handleKeyUp = (e) => this.keyState.delete(e.key);

    this.document.addEventListener('keydown', handleKeyDown, false);
    this.document.addEventListener('keyup', handleKeyUp, false);
  }

  initMouseControls(mouseMap) {
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
        mouseMap.x(dX * SENSITIVITY);
        
      }

      if (dY != 0) {
        mouseMap.y(dY * SENSITIVITY);
      }
    }

    this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
    this.document.exitPointerLock = this.document.exitPointerLock || this.document.mozExitPointerLock;

    this.canvas.onclick = () => this.canvas.requestPointerLock()

    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
  }

  checkKeyPress() {
    const MOVE_SPEED = 0.5;

    Object.entries(this.controlMap).forEach(([key, fn]) => {
      if (this.keyState.has(key)) {
        fn(MOVE_SPEED)
      }
    });
  }
}
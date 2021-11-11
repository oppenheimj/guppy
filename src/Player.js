import Entity from './Entity.js';

export default class Player extends Entity {
  constructor(device, id, position, right, up, forward) {
    super(device, position, right, up, forward);
    this.id = id;
  }

  serialize() {
    // TODO: do better
    return JSON.stringify({
      id: this.id,
      position: Array.from(this.position),
      right: Array.from(this.right),
      up: Array.from(this.up),
      forward: Array.from(this.forward),
    })
  }

  setDrawable(drawable) {
    this.drawable = drawable;
  }
}
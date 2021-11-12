import Entity from './Entity.js';

export default class Thing extends Entity {
    constructor(id, position, right, up, forward) {
        super(position, right, up, forward);
        this.id = id;
    }

    setDrawable(drawable) {
        this.drawable = drawable;
    }
}
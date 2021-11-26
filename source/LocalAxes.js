import Drawable from './Drawable.js';

export default class LocalAxes extends Drawable {
  constructor(device, vertexFormat) {
    super(device, vertexFormat);
    this.pipeline = 'line';
  }
}

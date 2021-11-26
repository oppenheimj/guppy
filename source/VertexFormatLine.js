import { BYTES_PER_FLOAT, FLOATS_PER_LINE_VERTEX } from './consts.js';

export default class VertexFormatLine {
  constructor() {
    this.vertexSize = FLOATS_PER_LINE_VERTEX * BYTES_PER_FLOAT;

    this.positionOffset = 0;
    this.colorOffset = 4 * BYTES_PER_FLOAT;

    this.vertexBuffers = [
      {
        shaderLocation: 0,
        offset: this.positionOffset,
        format: 'float32x4'
      },
      {
        shaderLocation: 1,
        offset: this.colorOffset,
        format: 'float32x4'
      }
    ];

    this.primitive = {
      topology: 'line-list'
    }
  }
}

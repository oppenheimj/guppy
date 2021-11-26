import { BYTES_PER_FLOAT, FLOATS_PER_TRI_VERTEX } from './consts.js';

export default class VertexFormatTri {
  constructor() {
    this.vertexSize = FLOATS_PER_TRI_VERTEX * BYTES_PER_FLOAT;

    this.positionOffset = 0;
    this.colorOffset = 4 * BYTES_PER_FLOAT;
    this.normalOffset = 8 * BYTES_PER_FLOAT;

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
      },
      {
        shaderLocation: 2,
        offset: this.normalOffset,
        format: 'float32x4'
      }
    ];

    this.primitive = {
      topology: 'triangle-list',
      cullMode: 'front'
    }
  }
}

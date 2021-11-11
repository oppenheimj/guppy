const BYTES_PER_FLOAT = 4;

export default class VertexFormat {
  constructor() {
    this.vertexSize = 12 * BYTES_PER_FLOAT;

    this.positionOffset = 0;
    this.colorOffset = 4 * BYTES_PER_FLOAT;
    this.normalOffset = 8 * BYTES_PER_FLOAT;

    this.vertexCount = 24;

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
  }
}
